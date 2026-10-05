local _, ns = ...

--- What the player's companion brought (External/Inbox.lua, written on this computer), handed to the other
--- bundles once their modules started: "sync.inbox" (inbox). Nothing happens without the companion.
--- Contract with the companion (apps/companion/src/domain/inbox.ts):
--- { version = 1, writtenAt = Unix seconds, raid = the next event as VXV-RAID text, or nil }.

-- Inboxes of a newer format come from a companion more recent than this addon.
local INBOX_VERSION = 1
local NEWER = "Ton compagnon VXV est plus récent que l'addon : mets l'addon à jour pour profiter de ses données."

VXV.On("modules.started", function()
    local inbox = ns.Inbox
    if type(inbox) ~= "table" then
        return
    end
    if (tonumber(inbox.version) or 0) > INBOX_VERSION then
        VXV.Print(NEWER)
        return
    end
    VXV.Emit("sync.inbox", inbox)
end)
