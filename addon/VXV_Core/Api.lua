local _, ns = ...

--- The only global of VXV_Core: the public API of the feature bundles (VXV_Raid, VXV_Paris…),
--- whose private namespaces cannot see the core's.
VXV = {
    --- Modules and the internal events between them (see Modules.lua and Bus.lua).
    RegisterModule = ns.Modules.Register,
    On = ns.Bus.On,
    Emit = ns.Bus.Emit,
    --- "/vxv <name>", listed by "/vxv aide".
    RegisterCommand = ns.Slash.Register,
    --- A message in the chat, under the VXV prefix.
    Print = ns.Chat.Print,
    --- (label, confirm(text)): a window to paste a text into, closed when confirm returns true.
    ShowPasteWindow = ns.TextWindow.ShowPaste,
    --- (owner, anchor, title, lines) and (): the game's tooltip.
    ShowTooltip = ns.Tooltip.Show,
    HideTooltip = ns.Tooltip.Hide,
    --- "Prénom Nom" of the player, or nil before the player is in the world.
    PlayerName = function()
        return ns.Names.OfUnit("player")
    end,
}
