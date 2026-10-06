local _, ns = ...

--- The bets as the website exports them (contract VXV-PARIS-1, packages/server/src/domain/addonBets.ts), brought
--- by the player's companion or passed on by an officer's addon, and kept in the saved data with who sent them.
local BetsData = {}
ns.BetsData = BetsData

local HEADER = "VXV-PARIS-1"

local saved = {}
local current

local function fields(line)
    local result = {}
    for field in (line .. ";"):gmatch("([^;]*);") do
        result[#result + 1] = field
    end
    return result
end

local function seconds(value)
    local number = tonumber(value)
    return number ~= nil and number > 0 and number or nil
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
    B = { 5, function(data, f)
        local bet = { id = f[1], closesAt = tonumber(f[2]), endedAt = seconds(f[3]), title = f[5], choices = {},
            stakes = {} }
        bet.winner = f[4] ~= "" and f[4] or nil
        data.bets[#data.bets + 1] = bet
        data.byId[bet.id] = bet
        return bet.closesAt ~= nil
    end },
    H = { 3, function(data, f)
        local bet = data.byId[f[1]]
        if bet == nil then
            return false
        end
        bet.choices[#bet.choices + 1] = { id = f[2], label = f[3] }
        return true
    end },
    S = { 8, function(data, f)
        local bet = data.byId[f[1]]
        local amount, gain = tonumber(f[6]), tonumber(f[8])
        if bet == nil or amount == nil or gain == nil then
            return false
        end
        bet.stakes[#bet.stakes + 1] = { memberId = f[2], name = f[3], class = f[4] ~= "" and f[4] or nil,
            choiceId = f[5], amount = amount, standing = f[7], gain = gain }
        return true
    end },
    T = { 3, function(data, f)
        data.cash.balance, data.cash.entries, data.cash.exits = tonumber(f[1]), tonumber(f[2]), tonumber(f[3])
        return data.cash.balance ~= nil and data.cash.entries ~= nil and data.cash.exits ~= nil
    end },
    K = { 3, function(data, f)
        local at, amount = tonumber(f[1]), tonumber(f[2])
        data.cash.movements[#data.cash.movements + 1] = { at = at, amount = amount, label = f[3] }
        return at ~= nil and amount ~= nil
    end },
    R = { 5, function(data, f)
        local rank, net, bets = tonumber(f[1]), tonumber(f[4]), tonumber(f[5])
        data.ranking[#data.ranking + 1] = { rank = rank, name = f[2], class = f[3] ~= "" and f[3] or nil,
            net = net, bets = bets }
        return rank ~= nil and net ~= nil and bets ~= nil
    end },
    C = { 3, function(data, f)
        data.results[f[1]] = { accepted = f[2] == "1", message = f[3] }
        return true
    end },
}

--- The bets read from the website's text, or nil when it is not VXV-PARIS-1 data.
function BetsData.Parse(text)
    if type(text) ~= "string" then
        return nil
    end
    local data = { officers = {}, members = {}, bets = {}, byId = {}, ranking = {}, results = {},
        cash = { balance = 0, entries = 0, exits = 0, movements = {} } }
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
                local kind = table.remove(f, 1)
                local rule = LINES[kind]
                -- A kind of line a newer website adds is left aside.
                if rule ~= nil and (#f < rule[1] or not rule[2](data, f)) then
                    return nil
                end
            end
        end
    end
    return headerSeen and data.exportedAt ~= nil and data or nil
end

--- Takes the module's saved data at start-up and reads the bets kept in it.
function BetsData.Restore(data)
    saved = data
    current = BetsData.Parse(data.text)
end

--- The text of the bets, as the website wrote it.
function BetsData.Text()
    return saved.text
end

--- When the bets were exported by the website (Unix seconds), 0 without data.
function BetsData.ExportedAt()
    return current and current.exportedAt or 0
end

--- The bets' data, or nil before the companion or an officer brought any.
function BetsData.Current()
    return current
end

--- True when the character named "Prénom Nom" belongs to an officer, according to the data.
function BetsData.IsOfficer(name)
    return current ~= nil and name ~= nil and current.officers[name] == true
end

--- Keeps the data, then tells the bundle ("paris.updated", data).
local function keep(text, data, sender)
    saved.text, saved.sender, current = text, sender, data
    VXV.Emit("paris.updated", data)
end

--- Data brought by the player's own companion: kept when newer, since the player's computer wrote them.
function BetsData.FromCompanion(text)
    local data = BetsData.Parse(text)
    if data == nil or (current ~= nil and data.exportedAt <= current.exportedAt) then
        return false
    end
    keep(text, data, nil)
    return true
end

--- Data an addon of the guild sent: kept when newer and sent by an officer the data name. Refusals stay silent.
function BetsData.Receive(text, sender)
    local data = BetsData.Parse(text)
    if data == nil or not VXV.AcceptsSharedData(data, current, sender) then
        return false
    end
    keep(text, data, sender)
    return true
end
