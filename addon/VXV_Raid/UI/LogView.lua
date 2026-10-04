local _, ns = ...

--- What the Butin tab shows: the current raid's record (bosses killed, items given, deaths), then the previous
--- raids. Built from the logs alone.
local LogView = {}
ns.LogView = LogView

local Labels = ns.Labels

local TIME = "%H:%M"
local NONE = "Aucun raid enregistré : les boss tués et les objets donnés s'y ajoutent pendant le raid."

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

local function lootText(loot)
    return loot.link .. " → " .. loot.winner .. " (" .. Labels.Method(loot.method) .. ")"
end

local function addCurrent(rows, log)
    rows[#rows + 1] = { kind = "title", text = log.title .. " · " .. Labels.DateTime(log.startsAt) }
    rows[#rows + 1] = { kind = "line", text = kills(log) }
    rows[#rows + 1] = { kind = "header", text = string.format("Objets donnés (%d)", #log.loots) }
    for _, loot in ipairs(log.loots) do
        rows[#rows + 1] = { kind = "line", text = lootText(loot), link = loot.link }
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
        text = string.format("%s · %s : %s, %s", log.title, Labels.DateTime(log.startsAt),
            VXV.Count(#log.kills, "boss", "boss"), VXV.Count(#log.loots, "objet")),
        tooltip = { title = log.title, lines = #lines > 0 and lines or { "Aucun objet donné." } },
    }
end

--- Rows of the tab, the logs being newest first; currentId is the loaded event's.
function LogView.Rows(logs, currentId)
    local rows, previous = {}, {}
    for _, log in ipairs(logs) do
        if log.eventId == currentId then
            addCurrent(rows, log)
        else
            previous[#previous + 1] = log
        end
    end
    if #previous > 0 then
        rows[#rows + 1] = { kind = "header", text = "Raids précédents" }
        for _, log in ipairs(previous) do
            addPrevious(rows, log)
        end
    end
    if #rows == 0 then
        rows[1] = { kind = "line", text = NONE }
    end
    return rows
end
