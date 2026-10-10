local _, ns = ...

--- The player's companion: what it brought (ns.Inbox, from External/Inbox.lua written on this computer) is handed
--- to the other bundles once their modules started, as "sync.inbox" (inbox). Nothing happens without it.
--- Contract with the companion (apps/companion/src/domain/inbox.ts):
--- { version = 1, writtenAt = Unix seconds, raid = the next event as VXV-RAID text, or nil, then each bundle's data
--- under its field: paris (VXV-PARIS, P11.8), quetes (VXV-QUETES, P12.8), titres (VXV-TITRES, P13.3)… }. Since
--- version 1.2, the companion carries any field the website adds: a new bundle needs no update of the companion.
local Companion = {}
ns.Companion = Companion

-- Inboxes of a newer format come from a companion more recent than this addon.
local INBOX_VERSION = 1

--- True when the player's companion wrote the inbox: the outbox then collects what it takes to the website.
function Companion.IsPresent()
    return type(ns.Inbox) == "table"
end

--- Hands the inbox over to the bundles; a newer format asks for the addon's update instead (under the Taverne).
function Companion.Deliver()
    if not Companion.IsPresent() then
        return
    end
    if (tonumber(ns.Inbox.version) or 0) > INBOX_VERSION then
        VXV.Emit("presence.outdated")
        return
    end
    VXV.Emit("sync.inbox", ns.Inbox)
end
