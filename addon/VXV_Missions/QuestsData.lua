local _, ns = ...

--- The missions as the website exports them (contract VXV-QUETES-1, packages/server/src/domain/addonMissions.ts),
--- brought by the player's companion or passed on by an officer's addon, and kept in the saved data.
local QuestsData = {}
ns.QuestsData = QuestsData

local HEADER = "VXV-QUETES-1"

local saved = {}
local current

local function fields(line)
    local result = {}
    for field in (line .. ";"):gmatch("([^;]*);") do
        result[#result + 1] = field
    end
    return result
end

local function class(token)
    return token ~= "" and token or nil
end

--- Each kind of line: its number of fields, and how it adds to the data (false when a value is wrong).
local LINES = {
    P = { 1, function(data, f)
        data.exportedAt = tonumber(f[1])
        return data.exportedAt ~= nil
    end },
    O = { 1, function(data, f)
        data.officers[f[1]] = true
        return true
    end },
    M = { 2, function(data, f)
        data.members[f[2]] = f[1]
        return true
    end },
    Q = { 7, function(data, f)
        local closedAt = tonumber(f[5])
        local mission = { id = f[1], kind = f[2], startsAt = tonumber(f[3]), endsAt = tonumber(f[4]),
            closedAt = closedAt ~= 0 and closedAt or nil, reward = tonumber(f[6]), title = f[7], scores = {},
            rewards = {} }
        data.missions[#data.missions + 1] = mission
        data.byId[mission.id] = mission
        return mission.startsAt ~= nil and mission.endsAt ~= nil and mission.reward ~= nil
    end },
    R = { 6, function(data, f)
        local mission = data.byId[f[1]]
        local score, reachedAt = tonumber(f[5]), tonumber(f[6])
        if mission == nil or score == nil or reachedAt == nil then
            return false
        end
        mission.scores[#mission.scores + 1] = { memberId = f[2], name = f[3], class = class(f[4]), score = score,
            reachedAt = reachedAt }
        return true
    end },
    W = { 5, function(data, f)
        local mission = data.byId[f[1]]
        local rank, amount = tonumber(f[2]), tonumber(f[4])
        if mission == nil or rank == nil or amount == nil then
            return false
        end
        mission.rewards[#mission.rewards + 1] = { rank = rank, name = f[3], amount = amount, paid = f[5] == "1" }
        return true
    end },
    F = { 5, function(data, f)
        local wins, gains, position = tonumber(f[3]), tonumber(f[4]), tonumber(f[5])
        data.hallOfFame[#data.hallOfFame + 1] = { name = f[1], class = class(f[2]), wins = wins, gains = gains,
            position = position }
        return wins ~= nil and gains ~= nil and position ~= nil
    end },
}

--- The missions read from the website's text, or nil when it is not VXV-QUETES-1 data.
function QuestsData.Parse(text)
    if type(text) ~= "string" then
        return nil
    end
    local data = { officers = {}, members = {}, missions = {}, byId = {}, hallOfFame = {} }
    local headerSeen = false
    for raw in (text .. "\n"):gmatch("([^\n]*)\n") do
        local line = raw:match("^%s*(.-)%s*$")
        if line ~= "" then
            if not headerSeen then
                if line ~= HEADER then
                    return nil
                end
                headerSeen = true
            else
                local f = fields(line)
                local rule = LINES[table.remove(f, 1)]
                -- A kind of line a newer website adds is left aside.
                if rule ~= nil and (#f < rule[1] or not rule[2](data, f)) then
                    return nil
                end
            end
        end
    end
    return headerSeen and data.exportedAt ~= nil and data or nil
end

--- Takes the module's saved data at start-up and reads the missions kept in it.
function QuestsData.Restore(data)
    saved = data
    current = QuestsData.Parse(data.text)
end

function QuestsData.Text()
    return saved.text
end

--- When the missions were exported by the website (Unix seconds), 0 without data.
function QuestsData.ExportedAt()
    return current and current.exportedAt or 0
end

--- The missions' data, or nil before the companion or an officer brought any.
function QuestsData.Current()
    return current
end

--- True when the character named "Prénom Nom" belongs to an officer, according to the data.
function QuestsData.IsOfficer(name)
    return current ~= nil and name ~= nil and current.officers[name] == true
end

local function keep(text, data, sender)
    saved.text, saved.sender, current = text, sender, data
    VXV.Emit("quetes.updated", data)
end

--- Data brought by the player's own companion: kept when newer.
function QuestsData.FromCompanion(text)
    local data = QuestsData.Parse(text)
    if data == nil or (current ~= nil and data.exportedAt <= current.exportedAt) then
        return false
    end
    keep(text, data, nil)
    return true
end

--- Data an addon of the guild sent: kept when newer and sent by an officer the data name. Refusals stay silent.
function QuestsData.Receive(text, sender)
    local data = QuestsData.Parse(text)
    if data == nil or not VXV.AcceptsSharedData(data, current, sender) then
        return false
    end
    keep(text, data, sender)
    return true
end
