#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <tlhelp32.h>
#include <vector>

#include <iostream>
#include <string>

struct SealHandleEntry {
    HANDLE value;
    ULONG_PTR handleCount, pointerCount;
    ULONG access, typeIndex, attributes, reserved;
};
struct SealHandleSnapshot { ULONG_PTR count, reserved; SealHandleEntry entries[1]; };

// Use a per-process handle snapshot, then compare kernel objects. Never close
// an arbitrary handle based on a name fragment or a stale system-wide index.
bool releaseRobloxMutexHandles(HANDLE mutex, DWORD onlyPid = 0) {
    using Query = LONG (NTAPI*)(HANDLE, ULONG, PVOID, ULONG, PULONG);
    using Compare = BOOL (WINAPI*)(HANDLE, HANDLE);
    auto query = reinterpret_cast<Query>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "NtQueryInformationProcess"));
    auto compare = reinterpret_cast<Compare>(GetProcAddress(GetModuleHandleW(L"kernelbase.dll"), "CompareObjectHandles"));
    if (!query || !compare) return false;
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) return false;
    DWORD ourSession = 0;
    ProcessIdToSessionId(GetCurrentProcessId(), &ourSession);
    PROCESSENTRY32W entry = {}; entry.dwSize = sizeof(entry);
    bool changed = false;
    for (BOOL found = Process32FirstW(snapshot, &entry); found; found = Process32NextW(snapshot, &entry)) {
        if (_wcsicmp(entry.szExeFile, L"RobloxPlayerBeta.exe") || (onlyPid && entry.th32ProcessID != onlyPid)) continue;
        DWORD session = 0;
        if (!ProcessIdToSessionId(entry.th32ProcessID, &session) || session != ourSession) continue;
        HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_DUP_HANDLE, FALSE, entry.th32ProcessID);
        if (!process) continue;
        wchar_t image[MAX_PATH * 4]; DWORD length = MAX_PATH * 4;
        if (!QueryFullProcessImageNameW(process, 0, image, &length)) { CloseHandle(process); continue; }
        const wchar_t* name = wcsrchr(image, L'\\');
        if (!name || _wcsicmp(name + 1, L"RobloxPlayerBeta.exe")) { CloseHandle(process); continue; }
        std::vector<unsigned char> buffer(65536);
        LONG status = -1; ULONG needed = 0;
        while (buffer.size() <= 16 * 1024 * 1024) {
            status = query(process, 51 /* ProcessHandleInformation */, buffer.data(), static_cast<ULONG>(buffer.size()), &needed);
            if (status >= 0) break;
            if (status != static_cast<LONG>(0xC0000004L)) break;
            buffer.resize((needed > buffer.size()) ? needed + 4096 : buffer.size() * 2);
        }
        if (status >= 0) {
            auto handles = reinterpret_cast<SealHandleSnapshot*>(buffer.data());
            const size_t maximum = (buffer.size() - offsetof(SealHandleSnapshot, entries)) / sizeof(SealHandleEntry);
            if (handles->count <= maximum) for (ULONG_PTR i = 0; i < handles->count; i++) {
                HANDLE copy = nullptr;
                if (!DuplicateHandle(process, handles->entries[i].value, GetCurrentProcess(), &copy, 0, FALSE, DUPLICATE_SAME_ACCESS)) continue;
                if (compare(copy, mutex)) {
                    // Recheck the current value immediately before closing it;
                    // the snapshot's handle could have been closed/reused.
                    HANDLE current = nullptr;
                    if (DuplicateHandle(process, handles->entries[i].value, GetCurrentProcess(), &current, 0, FALSE, DUPLICATE_SAME_ACCESS)) {
                        if (compare(current, mutex)) {
                            HANDLE closedCopy = nullptr;
                            if (DuplicateHandle(process, handles->entries[i].value, GetCurrentProcess(), &closedCopy, 0, FALSE, DUPLICATE_SAME_ACCESS | DUPLICATE_CLOSE_SOURCE)) {
                                changed = true; CloseHandle(closedCopy);
                            }
                        }
                        CloseHandle(current);
                    }
                }
                CloseHandle(copy);
            }
        }
        CloseHandle(process);
    }
    CloseHandle(snapshot);
    return changed;
}

int main(int argc, char* argv[]) {
    // Safe packaging probe: no mutex or Roblox process is touched.
    if (argc == 2 && std::string(argv[1]) == "--seal-stdio-probe") {
        std::cout << "READY" << std::endl;
        return 0;
    }
    if (argc != 2) return 2;
    DWORD parentPid = 0;
    try {
        const auto parsed = std::stoull(argv[1]);
        if (parsed == 0 || parsed > MAXDWORD) return 2;
        parentPid = static_cast<DWORD>(parsed);
    } catch (...) {
        return 2;
    }

    // Hold the standard Roblox singleton mutex before a client opens. This is
    // a normal native watcher, matching the architecture used by established
    // launchers without loading code into Roblox or reading its memory.
    HANDLE mutex = CreateMutexW(nullptr, FALSE, L"ROBLOX_singletonMutex");
    if (!mutex) return 3;

    DWORD wait = WaitForSingleObject(mutex, 0);
    bool ownsMutex = wait == WAIT_OBJECT_0 || wait == WAIT_ABANDONED;
    if (!ownsMutex && wait == WAIT_TIMEOUT && releaseRobloxMutexHandles(mutex)) {
        CloseHandle(mutex);
        mutex = CreateMutexW(nullptr, FALSE, L"ROBLOX_singletonMutex");
        if (!mutex) return 3;
        wait = WaitForSingleObject(mutex, 0);
        ownsMutex = wait == WAIT_OBJECT_0 || wait == WAIT_ABANDONED;
    }
    if (!ownsMutex) {
        CloseHandle(mutex);
        std::cout << "BUSY" << std::endl;
        return wait == WAIT_TIMEOUT ? 4 : 5;
    }

    std::cout << "READY" << std::endl;
    HANDLE parent = OpenProcess(SYNCHRONIZE, FALSE, parentPid);
    if (parent) {
        WaitForSingleObject(parent, INFINITE);
        CloseHandle(parent);
    }

    ReleaseMutex(mutex);
    CloseHandle(mutex);
    return 0;
}
