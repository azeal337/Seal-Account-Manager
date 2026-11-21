#define main seal_production_main
#include "../src/SealMutexHolder.cpp"
#undef main

int main(int argc, char** argv) {
    if (argc == 3 && std::string(argv[1]) == "--fixture") {
        const std::string base = argv[2];
        HANDLE mutex = CreateMutexA(nullptr, TRUE, (base + "-mutex").c_str());
        HANDLE unrelated = CreateEventA(nullptr, TRUE, FALSE, nullptr);
        HANDLE ready = OpenEventA(EVENT_MODIFY_STATE, FALSE, (base + "-ready").c_str());
        HANDLE stop = OpenEventA(SYNCHRONIZE, FALSE, (base + "-stop").c_str());
        SetEvent(ready);
        WaitForSingleObject(stop, 20000);
        DWORD flags = 0;
        const bool intact = GetHandleInformation(unrelated, &flags) != 0;
        CloseHandle(unrelated); CloseHandle(ready); CloseHandle(stop);
        return intact ? 0 : 8;
    }
    const std::string base = "Local\\SealMutexFixture-" + std::to_string(GetCurrentProcessId());
    HANDLE ready = CreateEventA(nullptr, TRUE, FALSE, (base + "-ready").c_str());
    HANDLE stop = CreateEventA(nullptr, TRUE, FALSE, (base + "-stop").c_str());
    char exe[4096]; GetModuleFileNameA(nullptr, exe, sizeof(exe));
    std::string command = "\"" + std::string(exe) + "\" --fixture " + base;
    STARTUPINFOA si = {}; si.cb = sizeof(si); PROCESS_INFORMATION pi = {};
    if (!CreateProcessA(nullptr, command.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &si, &pi)) return 2;
    int result = 0;
    if (WaitForSingleObject(ready, 5000) != WAIT_OBJECT_0) result = 3;
    HANDLE mutex = OpenMutexA(SYNCHRONIZE | MUTEX_MODIFY_STATE, FALSE, (base + "-mutex").c_str());
    if (!mutex || WaitForSingleObject(mutex, 0) != WAIT_TIMEOUT) result = 4;
    if (!result && !releaseRobloxMutexHandles(mutex, pi.dwProcessId)) result = 5;
    if (mutex) CloseHandle(mutex);
    mutex = CreateMutexA(nullptr, FALSE, (base + "-mutex").c_str());
    DWORD acquired = WaitForSingleObject(mutex, 0);
    if (acquired != WAIT_OBJECT_0 && acquired != WAIT_ABANDONED) result = 6;
    if (WaitForSingleObject(pi.hProcess, 0) != WAIT_TIMEOUT) result = 7;
    if (acquired == WAIT_OBJECT_0 || acquired == WAIT_ABANDONED) ReleaseMutex(mutex);
    CloseHandle(mutex);
    SetEvent(stop); WaitForSingleObject(pi.hProcess, 5000);
    DWORD code = 0; GetExitCodeProcess(pi.hProcess, &code);
    if (code) result = 8;
    CloseHandle(pi.hProcess); CloseHandle(pi.hThread); CloseHandle(stop); CloseHandle(ready);
    std::cout << (result ? "FAIL " : "PASS ") << result << ": singleton released, child alive, unrelated handle intact" << std::endl;
    return result;
}
