; Restore Roblox's stock browser protocol handler during uninstall, but only
; when the association still points at Seal. This leaves another launcher that
; the user selected later completely untouched.
!macro customUnInstall
  ReadRegStr $0 HKCU "Software\Classes\roblox-player\shell\open\command" ""
  StrCmp $0 '$\"$INSTDIR\Seal Account Manager.exe$\" $\"%1$\"' 0 seal_player_done
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\roblox-player" "InstallLocation"
  StrCmp $1 "" seal_player_remove 0
  WriteRegStr HKCU "Software\Classes\roblox-player" "" "URL:Roblox Protocol"
  WriteRegStr HKCU "Software\Classes\roblox-player" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\roblox-player\DefaultIcon" "" "$1\RobloxPlayerBeta.exe"
  WriteRegStr HKCU "Software\Classes\roblox-player\shell\open\command" "" '$\"$1\RobloxPlayerBeta.exe$\" $\"%1$\"'
  Goto seal_player_done
seal_player_remove:
  DeleteRegKey HKCU "Software\Classes\roblox-player"
seal_player_done:

  ReadRegStr $0 HKCU "Software\Classes\roblox\shell\open\command" ""
  StrCmp $0 '$\"$INSTDIR\Seal Account Manager.exe$\" $\"%1$\"' 0 seal_protocol_done
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\roblox-player" "InstallLocation"
  StrCmp $1 "" seal_protocol_remove 0
  WriteRegStr HKCU "Software\Classes\roblox" "" "URL:Roblox Protocol"
  WriteRegStr HKCU "Software\Classes\roblox" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\roblox\DefaultIcon" "" "$1\RobloxPlayerBeta.exe"
  WriteRegStr HKCU "Software\Classes\roblox\shell\open\command" "" '$\"$1\RobloxPlayerBeta.exe$\" $\"%1$\"'
  Goto seal_protocol_done
seal_protocol_remove:
  DeleteRegKey HKCU "Software\Classes\roblox"
seal_protocol_done:
!macroend
