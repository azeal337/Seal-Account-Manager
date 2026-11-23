# Seal Account Manager

The following video is a demo that showcases how to use Seal Account Manager: youtube.com/watch?v=Ep6lg9NbX28&

Seal Account Manager (SAM) is a portable Windows app that was initially inspired from Roblox Account Manager becoming untrustable and likely a virus that spiraled into this launcher.

[Download for Windows x64](https://github.com/azeal337/Seal-Account-Manager/releases/latest) 

![SAM 1.00.00 with the Lord of the Mysteries theme](docs/screenshots/sam-tarot.png)
## Features

- Save accounts, bulk import and export, colored folders and pin to accounts.
- Multi-account launches, save destinations, public server browser, server history.
- Session dashboard with freeze and wake controls, Anti-AFK, join message & optional Windows notifications.
- Games library with playtime, favorites, pins, and cached badge ownership and award dates.
- FPS, graphics, volume, Fast Flag presets, and Roblox client modification.


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
