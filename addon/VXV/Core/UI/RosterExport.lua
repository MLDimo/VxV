local ns = select(2, ...).Core

--- /vxv liste: the guild roster for the website's "Liste de guilde" page. Any member may export it: the
--- website lets officers only import it, since rights are checked by the server.
local Chat, Compat, Events, Roster = ns.Chat, ns.Compat, ns.Events, ns.Roster
local Slash, TextWindow, Util = ns.Slash, ns.TextWindow, ns.Util

local READY = "Liste de %s prête : Ctrl+C, puis colle-la dans la page Liste de guilde du site."

local waiting = false

local function export()
    local text, skipped = Roster.Format(Roster.Read())
    TextWindow.ShowCopy(text)
    local _, count = text:gsub("\n", "")
    Chat.Print(READY:format(Util.Count(count, "personnage")))
    if skipped > 0 then
        local left = Util.Count(skipped, "personnage laissé", "personnages laissés")
        Chat.Print(left .. " de côté, faute de nom de famille.")
    end
end

Events.On("GUILD_ROSTER_UPDATE", function()
    if waiting then
        waiting = false
        export()
    end
end)

Slash.Register("liste", "exporter la liste de guilde pour le site (import réservé aux officiers)", function()
    local ok, total = Compat.GetNumGuildMembers()
    if ok and (tonumber(total) or 0) > 0 then
        export()
        return
    end
    waiting = true
    Compat.RequestGuildRoster()
    Chat.Print("Lecture de la liste de guilde…")
end)
