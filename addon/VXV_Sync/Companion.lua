local _, ns = ...

--- The player's companion: what it brought (ns.Inbox, from External/Inbox.lua written on this computer) is handed
--- to the other bundles once their modules started, as "sync.inbox" (inbox). Nothing happens without it.
--- Contract with the companion (apps/companion/src/domain/inbox.ts):
--- { version = 1, writtenAt = Unix seconds, raid = the next event as VXV-RAID text, or nil, paris = the bets as
--- VXV-PARIS text (P11.8), or nil, quetes = the missions as VXV-QUETES text (P12.8), or nil }.
local Companion = {}
ns.Companion = Companion

-- Inboxes of a newer format come from a companion more recent than this addon.
local INBOX_VERSION = 1
local NEWER = "Ton compagnon VXV est plus récent que l'addon : mets l'addon à jour pour profiter de ses données."

--- True when the player's companion wrote the inbox: the outbox then collects what it takes to the website.
function Companion.IsPresent()
    return type(ns.Inbox) == "table"
end

--- Hands the inbox over to the bundles; a newer format asks for the addon's update instead.
function Companion.Deliver()
    if not Companion.IsPresent() then
        return
    end
    if (tonumber(ns.Inbox.version) or 0) > INBOX_VERSION then
        VXV.Print(NEWER)
        return
    end
    VXV.Emit("sync.inbox", ns.Inbox)
end
