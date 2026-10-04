local _, ns = ...

--- The event's data as the website exports it for the addon: contract VXV-RAID-1, described line by line in
--- packages/server/src/domain/addonExport.ts. Reading never raises a Lua error.
local EventData = {}
ns.EventData = EventData

local HEADER = "VXV-RAID-1"
local FLAG_ON = "1"
local NOT_EVENT = "Ce texte n'est pas une donnée d'événement : copie-la depuis la page de l'événement sur le site."
local UNREADABLE_LINE = "Ligne %d illisible : recopie les données depuis le site."

local function fields(line)
    local result = {}
    for field in (line .. ";"):gmatch("([^;]*);") do
        result[#result + 1] = field
    end
    return result
end

local function reserves(text)
    local list = {}
    for itemId, bonus in text:gmatch("(%d+):(%d+)") do
        list[#list + 1] = { itemId = tonumber(itemId), bonus = tonumber(bonus) }
    end
    return list
end

--- Each kind of line: its number of fields, and how it adds to the event (false when a value is wrong).
local RECORDS = {
    E = {
        size = 6,
        read = function(event, line)
            event.id, event.title = line[2], line[6]
            event.startsAt, event.exportedAt = tonumber(line[3]), tonumber(line[4])
            event.softReservesPerPlayer = tonumber(line[5])
            return event.startsAt ~= nil and event.exportedAt ~= nil and event.softReservesPerPlayer ~= nil
        end,
    },
    O = {
        size = 2,
        read = function(event, line)
            event.officers[line[2]] = true
            return true
        end,
    },
    I = {
        size = 5,
        read = function(event, line)
            local id = tonumber(line[2])
            if id == nil then
                return false
            end
            event.items[id] = { id = id, name = line[3], boss = line[4], excluded = line[5] == FLAG_ON }
            event.itemOrder[#event.itemOrder + 1] = id
            return true
        end,
    },
    S = {
        size = 8,
        read = function(event, line)
            event.signups[#event.signups + 1] = {
                name = line[2],
                class = line[3],
                role = line[4],
                status = line[5],
                reroll = line[6] == FLAG_ON,
                spec = line[7],
                reserves = reserves(line[8]),
            }
            return true
        end,
    },
    J = {
        size = 5,
        read = function(event, line)
            local at = tonumber(line[2])
            if at == nil then
                return false
            end
            event.journal[#event.journal + 1] = { at = at, actor = line[3], summary = line[4], reason = line[5] }
            return true
        end,
    },
}

--- The event written in the text, or nil and why (in French) when the text is not readable VXV-RAID-1 data.
--- Lines of an unknown kind are skipped.
function EventData.Parse(text)
    if type(text) ~= "string" then
        return nil, NOT_EVENT
    end
    local event = { officers = {}, items = {}, itemOrder = {}, signups = {}, journal = {} }
    local number, headerSeen = 0, false
    for raw in (text .. "\n"):gmatch("([^\n]*)\n") do
        number = number + 1
        local line = raw:match("^%s*(.-)%s*$")
        if line ~= "" and not headerSeen then
            if line ~= HEADER then
                return nil, NOT_EVENT
            end
            headerSeen = true
        elseif line ~= "" then
            local values = fields(line)
            local record = RECORDS[values[1]]
            if record ~= nil and (#values ~= record.size or not record.read(event, values)) then
                return nil, UNREADABLE_LINE:format(number)
            end
        end
    end
    if event.id == nil then
        return nil, NOT_EVENT
    end
    return event
end
