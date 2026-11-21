# Seal Account Manager

Seal Account Manager (SAM) is a portable Windows app for managing Roblox accounts, launching sessions with per-account settings, and tracking playtime and badges.

[Download for Windows x64](https://github.com/azeal337/Seal-Account-Manager/releases/latest) · [Getting started](docs/GETTING-STARTED.md) · [Contributing](CONTRIBUTING.md)

![SAM 1.00.00 in the Lord of the Mysteries theme, with fictional accounts](docs/screenshots/dashboard.png)

## Features

- Saved accounts, bulk import and settings, colored folders, and account pinning.
- Multi-account launches, saved destinations, public server browser, and server history.
- Session dashboard with freeze and wake controls, Anti-AFK, join notifications, and optional Windows alerts.
- Quiet Roblox Home and website Play handling, background playtime tracking, and hidden startup at Windows sign-in.
- Games library with playtime, favorites, pins, and cached badge ownership and award dates.
- FPS, graphics, volume, FastFlag presets, and Roblox client customization.
- Interface themes and per-page appearance settings, including Lord of the Mysteries with an animated Grey Fog scene and tarot-style panels.

## Run SAM

Download `Seal-Account-Manager-1.00.00-Portable.exe` from **Releases** and open it. Quit any running SAM copy from its tray menu before switching builds. Open **Add account** to sign in through Roblox.

## Build from source

Use Windows x64, Node.js 24, pnpm 11, and Visual Studio C++ Build Tools with a Windows SDK.

```powershell
pnpm install --frozen-lockfile
pnpm run build:portable
```

The build compiles the Windows helpers, packages the executable, and runs a two-instance startup test. The output is in `dist/`.

## Local data

SAM saves its profile in `%APPDATA%\Seal Account Manager` and uses Windows encryption for saved Roblox logins. Remove login cookies, authentication tickets, and private server links from bug reports. See the [third-party notices](THIRD-PARTY-NOTICES.md) for bundled components.

Seal Account Manager is an independent project.
