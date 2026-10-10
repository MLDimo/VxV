local ns = select(2, ...).Raid

--- What the Journal's page shows (§7.7): the raids recorded in game, the current one in full (bosses killed, items
--- given, deaths) then the previous ones, and the officers' changes to the loaded event with their reason. Built
--- from the data alone.
local JournalView = {}
ns.JournalView = JournalView

local Labels = ns.Labels

local TIME = "%H:%M"
local NONE = "Aucun raid enregistré : les boss tués et les objets donnés s'y ajoutent pendant le raid."
-- The stamps of the entries (§7.7), in their category's ink.
local STAMPS = { raid = { text = "RAID", color = "stamp-raid" }, loot = { text = "LOOT", color = "stamp-loot" } }

local function itemName(link)
    return link:match("%[(.-)%]") or link
end

local function kills(log)
    local parts = {}
    for _, kill in ipairs(log.kills) do
        parts[#parts + 1] = kill.boss .. " (" .. date(TIME, kill.at) .. ")"
    end
    return #parts > 0 and ("Boss tués : " .. table.concat(parts, ", ")) or "Aucun boss tué pour l'instant."
end

local function deaths(log)
    local names = {}
    for name in pairs(log.deaths) do
        names[#names + 1] = name
    end
    table.sort(names, function(left, right)
        if log.deaths[left] ~= log.deaths[right] then
            return log.deaths[left] > log.deaths[right]
        end
        return left < right
    end)
    local parts = {}
    for _, name in ipairs(names) do
        parts[#parts + 1] = name .. " ×" .. log.deaths[name]
    end
    return #parts > 0 and ("Morts : " .. table.concat(parts, ", ")) or "Aucune mort."
end

local function addCurrent(rows, log)
    rows[#rows + 1] = { kind = "title", text = log.title .. " · " .. Labels.DateTime(log.startsAt) }
    rows[#rows + 1] = { kind = "line", text = kills(log), stamp = STAMPS.raid }
    rows[#rows + 1] = { kind = "header", text = string.format("Objets donnés (%d)", #log.loots) }
    for _, loot in ipairs(log.loots) do
        rows[#rows + 1] = { kind = "line", stamp = STAMPS.loot, link = loot.link,
            text = loot.link .. " → " .. loot.winner .. " (" .. Labels.Method(loot.method) .. ")" }
    end
    rows[#rows + 1] = { kind = "line", text = deaths(log) }
end

local function addPrevious(rows, log)
    local lines = {}
    for _, loot in ipairs(log.loots) do
        lines[#lines + 1] = itemName(loot.link) .. " → " .. loot.winner .. " (" .. Labels.Method(loot.method) .. ")"
    end
    rows[#rows + 1] = {
        kind = "line",
        stamp = STAMPS.raid,
        text = string.format("%s · %s : %s, %s", log.title, Labels.DateTime(log.startsAt),
            VXV.Count(#log.kills, "boss", "boss"), VXV.Count(#log.loots, "objet")),
        tooltip = { title = log.title, lines = #lines > 0 and lines or { "Aucun objet donné." } },
    }
end

--- The officers' changes to the event, the latest first: who and when, what, and why.
local function addChanges(rows, event)
    local entries = {}
    for _, entry in ipairs(event and event.journal or {}) do
        entries[#entries + 1] = entry
    end
    if #entries == 0 then
        return
    end
    table.sort(entries, function(left, right)
        return left.at > right.at
    end)
    rows[#rows + 1] = { kind = "title", text = "Modifications des officiers" }
    for _, entry in ipairs(entries) do
        rows[#rows + 1] = { kind = "line", stamp = STAMPS.raid,
            text = Labels.DateTime(entry.at) .. " · " .. entry.actor }
        rows[#rows + 1] = { kind = "header", text = entry.summary }
        rows[#rows + 1] = { kind = "line", text = "Motif : " .. entry.reason }
    end
end

--- Rows of the page, the logs being newest first; event is the loaded one.
function JournalView.Rows(logs, event)
    local rows, previous = {}, {}
    for _, log in ipairs(logs) do
        if event ~= nil and log.eventId == event.id then
            addCurrent(rows, log)
        else
            previous[#previous + 1] = log
        end
    end
    if #previous > 0 then
        rows[#rows + 1] = { kind = "title", text = "Raids précédents" }
        for _, log in ipairs(previous) do
            addPrevious(rows, log)
        end
    end
    if #rows == 0 then
        rows[1] = { kind = "line", text = NONE }
    end
    addChanges(rows, event)
    return rows
end
