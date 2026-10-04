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
    --- A message in the chat, under the VXV prefix; and (value, singular, plural) for "3 invitations".
    Print = ns.Chat.Print,
    Count = ns.Util.Count,
    --- (label, confirm(text)): a window to paste a text into, closed when confirm returns true.
    ShowPasteWindow = ns.TextWindow.ShowPaste,
    --- (owner, anchor, title, lines) and (): the game's tooltip.
    ShowTooltip = ns.Tooltip.Show,
    HideTooltip = ns.Tooltip.Hide,
    --- (kind, payload): data of any size to every member connected with VXV, this player included; and
    --- (kind, handler(payload, sender)) to receive them. Kinds start with the bundle's name ("raid.data").
    Broadcast = ns.Comm.Broadcast,
    OnMessage = ns.Comm.On,
    --- Names of the members connected with VXV, this player included, in alphabetical order.
    Online = ns.Presence.Online,
    --- (event, handler(...)): a game event, among those measured on WoW Forever.
    OnEvent = ns.Events.On,
    --- The guild members the client knows: { name, class, online }.
    GuildMembers = ns.Roster.Read,
    --- "Prénom Nom" of a unit ("raid3", "party1"…), or nil when the client has none or hides it.
    NameOfUnit = ns.Names.OfUnit,
    --- "Prénom Nom" of the player, or nil before the player is in the world.
    PlayerName = function()
        return ns.Names.OfUnit("player")
    end,
}
