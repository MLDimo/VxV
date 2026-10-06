local _, ns = ...

--- The readings of the game's counters (P12.4): the player's characters' counters are read at login then every
--- minute out of combat; each change is kept for the companion (VXV_Sync's outbox), which takes it to the website,
--- and told to the guild, where an officer with the companion relays it for a member without one. The player's
--- live score on each running mission is told to the guild too (P12.5).
local Readings = {}
ns.Readings = Readings

local Counters, Quests, QuestsData = ns.Counters, ns.Quests, ns.QuestsData

local OUTBOX = "counters"
local COUNTER, SCORE = "quetes.counter", "quetes.score"
local FIRST_READ_SECONDS, READ_EVERY_SECONDS = 5, 60
-- Readings kept by character and counter: enough for a month of missions.
local KEEP = 100

local saved = { history = {} }

--- Takes the module's saved data at start-up (the readings of the account's characters).
function Readings.Restore(data)
    saved = data
    saved.history = type(saved.history) == "table" and saved.history or {}
end

--- A reading for the website, under its key in the outbox.
local function put(name, kind, value, at)
    VXV.Emit("sync.put", OUTBOX, name .. "|" .. kind, { name = name, type = kind, value = value, at = at })
end

--- Keeps a reading of a character when its counter moved; true when it did.
local function note(name, kind, value, at)
    saved.history[name] = saved.history[name] or {}
    local list = saved.history[name][kind] or {}
    saved.history[name][kind] = list
    local last = list[#list]
    if last ~= nil and last.value == value then
        return false
    end
    list[#list + 1] = { value = value, at = at }
    while #list > KEEP do
        table.remove(list, 1)
    end
    put(name, kind, value, at)
    return true
end

--- What a character's counter gained during the mission, and when it last moved: from its last reading before the
--- start, else from its first reading during the mission, as the website counts it.
local function characterScore(list, mission)
    local baseline, latest
    for _, reading in ipairs(list) do
        if reading.at <= mission.startsAt then
            baseline = reading
        elseif reading.at <= mission.endsAt then
            baseline = baseline or reading
            latest = reading
        end
    end
    if baseline == nil or latest == nil then
        return 0, nil
    end
    return math.max(0, latest.value - baseline.value), latest.at
end

--- The player's member's score on the mission: the account's characters of that member, added up.
function Readings.Score(mission, data)
    local memberId = Quests.MemberId(data)
    local score, reachedAt = 0, nil
    for name, kinds in pairs(saved.history) do
        if kinds[mission.kind] ~= nil and (name == VXV.PlayerName() or Quests.MemberId(data, name) == memberId) then
            local gained, at = characterScore(kinds[mission.kind], mission)
            score = score + gained
            if gained > 0 and (reachedAt == nil or at > reachedAt) then
                reachedAt = at
            end
        end
    end
    return score, reachedAt
end

--- Tells the guild the player's score on each running mission, and keeps it in the live ranking.
local function shareScores()
    local data, name = QuestsData.Current(), VXV.PlayerName()
    local memberId = Quests.MemberId(data)
    if memberId == nil then
        return
    end
    for _, mission in ipairs(Quests.WithStatus(data, time(), "running")) do
        local score, reachedAt = Readings.Score(mission, data)
        if score > 0 then
            Quests.Hear(mission.id, memberId, { name = name, score = score, reachedAt = reachedAt })
            VXV.Broadcast(SCORE, { missionId = mission.id, score = score, reachedAt = reachedAt })
        end
    end
end

--- Reads every counter of the player's character, and tells what moved.
local function readCounters()
    local name = VXV.PlayerName()
    if name == nil then
        return
    end
    local moved = false
    for _, kind in ipairs(Counters.Readable()) do
        local value, now = Counters.Read(kind), time()
        if value ~= nil and note(name, kind, value, now) then
            moved = true
            VXV.Broadcast(COUNTER, { type = kind, value = value, at = now })
        end
    end
    if moved then
        shareScores()
    end
end

local function tick()
    readCounters()
    C_Timer.After(READ_EVERY_SECONDS, tick)
end

--- Reads the counters a few seconds after login (the client fills them late), then every minute.
function Readings.Start()
    C_Timer.After(FIRST_READ_SECONDS, tick)
end

-- A gathering counted by the addon: read at once.
VXV.On("quetes.gathered", readCounters)

-- An officer with the companion relays the counters of the others; the website checks that the relay is an officer.
VXV.OnMessage(COUNTER, function(payload, sender)
    local me = VXV.PlayerName()
    if sender == me or not VXV.CompanionSeen() or not QuestsData.IsOfficer(me) or type(payload) ~= "table"
        or Counters.LABELS[payload.type] == nil or type(payload.value) ~= "number" or type(payload.at) ~= "number" then
        return
    end
    put(sender, payload.type, payload.value, payload.at)
end)

-- The guild's live scores (P12.5): each member tells their own.
VXV.OnMessage(SCORE, function(payload, sender)
    local data = QuestsData.Current()
    local memberId = Quests.MemberId(data, sender)
    if memberId == nil or type(payload) ~= "table" or type(payload.missionId) ~= "string"
        or type(payload.score) ~= "number" or type(payload.reachedAt) ~= "number" then
        return
    end
    Quests.Hear(payload.missionId, memberId, { name = sender, score = payload.score, reachedAt = payload.reachedAt })
end)

-- New missions: the player's scores on them go to the guild.
VXV.On("quetes.updated", shareScores)
