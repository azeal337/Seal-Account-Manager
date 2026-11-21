#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <algorithm>
#include <atomic>
#include <cctype>
#include <cstdint>
#include <iostream>
#include <map>
#include <mutex>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#ifndef PROCESS_SUSPEND_RESUME
#define PROCESS_SUSPEND_RESUME 0x0800
#endif

namespace {

using NtSuspendProcessFn = LONG(NTAPI*)(HANDLE);
using NtResumeProcessFn = LONG(NTAPI*)(HANDLE);

struct TargetState {
    DWORD pid = 0;
    std::string mode = "sleep";
    std::uint64_t sleepMs = 6000;
    std::uint64_t wakeMs = 500;
    bool suspended = false;
    std::uint64_t nextTransition = 0;
};

std::atomic<bool> stopping{false};
std::mutex targetGate;
std::map<DWORD, TargetState> targets;
std::wstring pipePath;

NtSuspendProcessFn SuspendFunction() {
    static NtSuspendProcessFn function = [] {
        HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
        return ntdll
            ? reinterpret_cast<NtSuspendProcessFn>(GetProcAddress(ntdll, "NtSuspendProcess"))
            : nullptr;
    }();
    return function;
}

NtResumeProcessFn ResumeFunction() {
    static NtResumeProcessFn function = [] {
        HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
        return ntdll
            ? reinterpret_cast<NtResumeProcessFn>(GetProcAddress(ntdll, "NtResumeProcess"))
            : nullptr;
    }();
    return function;
}

std::wstring ToWide(const std::string& value) {
    if (value.empty()) return {};
    const int count = MultiByteToWideChar(CP_UTF8, 0, value.data(), static_cast<int>(value.size()), nullptr, 0);
    if (count <= 0) return {};
    std::wstring result(static_cast<std::size_t>(count), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, value.data(), static_cast<int>(value.size()), result.data(), count);
    return result;
}

std::vector<std::string> Split(const std::string& value, char delimiter) {
    std::vector<std::string> result;
    std::string part;
    std::istringstream stream(value);
    while (std::getline(stream, part, delimiter)) result.push_back(part);
    if (!value.empty() && value.back() == delimiter) result.emplace_back();
    return result;
}

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front()))) value.erase(value.begin());
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back()))) value.pop_back();
    return value;
}

std::string Upper(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    return value;
}

std::uint64_t ParseDuration(const std::string& value, std::uint64_t fallback, std::uint64_t minimum, std::uint64_t maximum) {
    try {
        const auto parsed = std::stoll(value);
        if (parsed < 0) return fallback;
        return std::clamp<std::uint64_t>(static_cast<std::uint64_t>(parsed), minimum, maximum);
    } catch (...) {
        return fallback;
    }
}

std::vector<DWORD> ParsePids(const std::string& value) {
    std::vector<DWORD> result;
    for (const std::string& part : Split(value, ',')) {
        try {
            const auto parsed = std::stoull(part);
            if (parsed == 0 || parsed > MAXDWORD) continue;
            const DWORD pid = static_cast<DWORD>(parsed);
            if (std::find(result.begin(), result.end(), pid) == result.end()) result.push_back(pid);
        } catch (...) {}
    }
    return result;
}

HANDLE OpenVerifiedRobloxProcess(DWORD pid) {
    // SYNCHRONIZE is required by WaitForSingleObject below. Without it the
    // liveness check returns WAIT_FAILED after the first suspend, causing a
    // pulse target to be discarded before it can wake and refreeze.
    HANDLE process = OpenProcess(PROCESS_SUSPEND_RESUME | PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, FALSE, pid);
    if (!process) return nullptr;

    std::vector<wchar_t> path(32768, L'\0');
    DWORD size = static_cast<DWORD>(path.size());
    if (!QueryFullProcessImageNameW(process, 0, path.data(), &size)) {
        CloseHandle(process);
        return nullptr;
    }

    const wchar_t* base = path.data();
    for (DWORD index = 0; index < size; ++index) {
        if (path[index] == L'\\' || path[index] == L'/') base = path.data() + index + 1;
    }
    if (_wcsicmp(base, L"RobloxPlayerBeta.exe") != 0) {
        CloseHandle(process);
        return nullptr;
    }
    return process;
}

bool IsLiveRobloxProcess(DWORD pid) {
    HANDLE process = OpenVerifiedRobloxProcess(pid);
    if (!process) return false;
    const DWORD wait = WaitForSingleObject(process, 0);
    CloseHandle(process);
    return wait == WAIT_TIMEOUT;
}

bool Suspend(TargetState& state) {
    if (state.suspended) return true;
    NtSuspendProcessFn suspendProcess = SuspendFunction();
    if (!suspendProcess) return false;
    HANDLE process = OpenVerifiedRobloxProcess(state.pid);
    if (!process) return false;
    const LONG result = suspendProcess(process);
    CloseHandle(process);
    if (result != 0) return false;
    state.suspended = true;
    return true;
}

void Resume(TargetState& state) {
    if (!state.suspended) return;
    NtResumeProcessFn resumeProcess = ResumeFunction();
    HANDLE process = resumeProcess ? OpenVerifiedRobloxProcess(state.pid) : nullptr;
    if (process) {
        resumeProcess(process);
        CloseHandle(process);
    }
    state.suspended = false;
}

void ResumeAll() {
    std::lock_guard<std::mutex> lock(targetGate);
    for (auto& entry : targets) Resume(entry.second);
    targets.clear();
}

std::string SetTargets(const std::vector<std::string>& parts) {
    if (parts.size() < 5) return "ERR|Invalid SET command";
    const std::string mode = parts[1] == "pulse" ? "pulse" : "sleep";
    const std::uint64_t sleepMs = ParseDuration(parts[2], 6000, 1000, 60000);
    const std::uint64_t wakeMs = ParseDuration(parts[3], 500, 500, 5000);
    const std::uint64_t now = GetTickCount64();
    int accepted = 0;

    std::lock_guard<std::mutex> lock(targetGate);
    for (DWORD pid : ParsePids(parts[4])) {
        const auto previous = targets.find(pid);
        if (previous != targets.end()) {
            Resume(previous->second);
            targets.erase(previous);
        }

        TargetState state;
        state.pid = pid;
        state.mode = mode;
        state.sleepMs = sleepMs;
        state.wakeMs = wakeMs;
        state.nextTransition = now + sleepMs;
        if (!Suspend(state)) continue;
        targets.emplace(pid, std::move(state));
        ++accepted;
    }
    return "OK|" + std::to_string(accepted);
}

std::string ResumeTargets(const std::vector<std::string>& parts) {
    if (parts.size() < 2) return "ERR|Invalid RESUME command";
    int resumed = 0;
    std::lock_guard<std::mutex> lock(targetGate);
    for (DWORD pid : ParsePids(parts[1])) {
        const auto found = targets.find(pid);
        if (found == targets.end()) continue;
        Resume(found->second);
        targets.erase(found);
        ++resumed;
    }
    return "OK|" + std::to_string(resumed);
}

std::string Status() {
    std::ostringstream output;
    output << "OK|";
    std::lock_guard<std::mutex> lock(targetGate);
    bool first = true;
    for (const auto& entry : targets) {
        if (!first) output << ',';
        first = false;
        const TargetState& state = entry.second;
        output << state.pid << ':' << state.mode << ':' << (state.suspended ? "sleeping" : "awake");
    }
    return output.str();
}

std::string HandleCommand(const std::string& rawCommand) {
    const std::vector<std::string> parts = Split(Trim(rawCommand), '|');
    const std::string action = parts.empty() ? "" : Upper(parts.front());
    if (action == "PING") return "OK|PONG";
    if (action == "SET") return SetTargets(parts);
    if (action == "RESUME") return ResumeTargets(parts);
    if (action == "STATUS") return Status();
    if (action == "CLEAR") { ResumeAll(); return "OK|0"; }
    if (action == "SHUTDOWN") { ResumeAll(); stopping = true; return "OK|BYE"; }
    return "ERR|Unknown command";
}

void WakePipe() {
    for (int attempt = 0; attempt < 10; ++attempt) {
        HANDLE pipe = CreateFileW(pipePath.c_str(), GENERIC_WRITE, 0, nullptr, OPEN_EXISTING, 0, nullptr);
        if (pipe != INVALID_HANDLE_VALUE) {
            const char request[] = "PING\n";
            DWORD written = 0;
            WriteFile(pipe, request, static_cast<DWORD>(sizeof(request) - 1), &written, nullptr);
            CloseHandle(pipe);
            return;
        }
        Sleep(50);
    }
}

void WatchParent(DWORD parentPid) {
    HANDLE parent = OpenProcess(SYNCHRONIZE, FALSE, parentPid);
    if (parent) {
        WaitForSingleObject(parent, INFINITE);
        CloseHandle(parent);
    }
    stopping = true;
    ResumeAll();
    WakePipe();
}

void RunTransitions() {
    while (!stopping) {
        const std::uint64_t now = GetTickCount64();
        {
            std::lock_guard<std::mutex> lock(targetGate);
            std::vector<DWORD> dead;
            for (auto& entry : targets) {
                TargetState& state = entry.second;
                if (!IsLiveRobloxProcess(state.pid)) {
                    dead.push_back(state.pid);
                    continue;
                }
                if (state.mode != "pulse" || now < state.nextTransition) continue;
                if (state.suspended) {
                    Resume(state);
                    state.nextTransition = now + state.wakeMs;
                } else if (Suspend(state)) {
                    state.nextTransition = now + state.sleepMs;
                } else {
                    dead.push_back(state.pid);
                }
            }
            for (DWORD pid : dead) targets.erase(pid);
        }
        Sleep(20);
    }
}

bool ReadCommand(HANDLE pipe, std::string& command) {
    command.clear();
    char buffer[1024];
    while (command.size() < 16384) {
        DWORD read = 0;
        if (!ReadFile(pipe, buffer, sizeof(buffer), &read, nullptr) || read == 0) return !command.empty();
        command.append(buffer, buffer + read);
        const auto newline = command.find('\n');
        if (newline != std::string::npos) {
            command.resize(newline);
            if (!command.empty() && command.back() == '\r') command.pop_back();
            return true;
        }
    }
    return false;
}

void RunPipeServer() {
    while (!stopping) {
        HANDLE pipe = CreateNamedPipeW(
            pipePath.c_str(),
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
            1,
            4096,
            4096,
            0,
            nullptr
        );
        if (pipe == INVALID_HANDLE_VALUE) {
            Sleep(100);
            continue;
        }

        const BOOL connected = ConnectNamedPipe(pipe, nullptr)
            ? TRUE
            : GetLastError() == ERROR_PIPE_CONNECTED;
        if (connected) {
            std::string command;
            if (ReadCommand(pipe, command)) {
                const std::string response = HandleCommand(command) + "\n";
                DWORD written = 0;
                WriteFile(pipe, response.data(), static_cast<DWORD>(response.size()), &written, nullptr);
                FlushFileBuffers(pipe);
            }
            DisconnectNamedPipe(pipe);
        }
        CloseHandle(pipe);
    }
}

}  // namespace

int main(int argc, char* argv[]) {
    if (argc == 2 && std::string(argv[1]) == "--seal-stdio-probe") {
        std::cout << "READY" << std::endl;
        return 0;
    }
    if (argc < 3) return 2;
    DWORD parentPid = 0;
    try {
        const auto parsed = std::stoull(argv[1]);
        if (parsed == 0 || parsed > MAXDWORD) return 2;
        parentPid = static_cast<DWORD>(parsed);
    } catch (...) {
        return 2;
    }

    const std::wstring pipeName = ToWide(argv[2]);
    if (pipeName.empty() || pipeName.find_first_of(L"\\/") != std::wstring::npos) return 2;
    pipePath = L"\\\\.\\pipe\\" + pipeName;
    if (!SuspendFunction() || !ResumeFunction()) return 3;

    std::thread parentThread(WatchParent, parentPid);
    parentThread.detach();
    std::thread transitionThread(RunTransitions);

    RunPipeServer();
    stopping = true;
    if (transitionThread.joinable()) transitionThread.join();
    ResumeAll();
    return 0;
}
