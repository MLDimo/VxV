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
    --- Gold pieces as the website writes them: Format(1000) "1 000 po", Signed(-120) "−120 po", Odds, Share.
    Gold = ns.Gold,
    --- (label, confirm(text)): a window to paste a text into, closed when confirm returns true; and (text): a
    --- window showing a text selected, ready for Ctrl+C.
    ShowPasteWindow = ns.TextWindow.ShowPaste,
    ShowCopyWindow = ns.TextWindow.ShowCopy,
    --- (owner, anchor, title, lines), (owner, anchor, item link) and (): the game's tooltip.
    ShowTooltip = ns.Tooltip.Show,
    ShowItemTooltip = ns.Tooltip.ShowLink,
    HideTooltip = ns.Tooltip.Hide,
    --- (kind, payload): data of any size to every member connected with VXV, this player included; and
    --- (kind, handler(payload, sender)) to receive them. Kinds start with the bundle's name ("raid.data").
    Broadcast = ns.Comm.Broadcast,
    OnMessage = ns.Comm.On,
    --- (name, source): data the guild's addons pass on to each other, from the officers; returns { Send, Start }.
    --- See Core/SharedData.lua.
    ShareData = ns.SharedData.Create,
    --- (data, current, sender): whether data sent by an addon of the guild replace the current ones.
    AcceptsSharedData = ns.SharedData.Accepts,
    --- (options): the data the website exports for a bundle (VXV-PARIS, VXV-QUETES…), brought by the companion and
    --- passed on by the officers. See Core/SiteData.lua.
    SiteData = ns.SiteData.Create,
    --- (options): changes made in game, waiting for the website, relayed by an officer with the companion; and
    --- (): whether the player's companion brought data at this launch. See Core/PendingChanges.lua.
    PendingChanges = ns.PendingChanges.Create,
    CompanionSeen = ns.PendingChanges.CompanionSeen,
    --- (text): an announcement in the group's channel, held during a boss encounter.
    SayToGroup = ns.GroupChat.Say,
    --- The Blizzard API whose names vary, with the pcall contract (ok, ...): see Core/Compat.lua.
    Compat = ns.Compat,
    --- Names of the members connected with VXV, this player included, in alphabetical order.
    Online = ns.Presence.Online,
    --- (event, handler(...)): a game event, among those measured on WoW Forever.
    OnEvent = ns.Events.On,
    --- The guild members the client knows: { name, class, online }.
    GuildMembers = ns.Roster.Read,
    --- The roster as the website imports it (VXV-ROSTER-1 text), and how many characters it holds.
    GuildRosterText = function()
        local text = ns.Roster.Format(ns.Roster.Read())
        local _, count = text:gsub("\n", "")
        return text, count
    end,
    --- (value): true when the client hides the value (secret): it may be neither compared nor stored.
    IsSecret = ns.Util.IsSecret,
    --- "Prénom Nom" of a unit ("raid3", "party1"…), or nil when the client has none or hides it.
    NameOfUnit = ns.Names.OfUnit,
    --- (name, class token): the name in the game's class color, else the charter's.
    ClassColored = ns.Theme.ClassColored,
    --- The charter's fonts, colors and pixel frames (panels, buttons, rings): see UI/Theme.lua.
    Theme = ns.Theme,
    --- (name, width, height, title): a small window in the charter, closed by Escape; returns it and its body.
    CreateDialog = ns.Dialog.Create,
    --- Lists of text rows scrolled with the wheel: RowList.Create(parent, topOffset, palette), RowList.RULE; in a
    --- titled panel of a screen, RowList.Panel; filling a tab of the reduced mode, RowList.Fill.
    RowList = ns.RowList,
    --- "Prénom Nom" of the player, or nil before the player is in the world.
    PlayerName = function()
        return ns.Names.OfUnit("player")
    end,
}
