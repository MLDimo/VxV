local ns = select(2, ...).Missions

--- What the player does with the guild (owner's request of 3 November): the dungeons done, their last boss killed
--- (data/dungeons, Dungeons.lua), and the battlegrounds won, each with another guild member connected with VXV in the
--- group. The game counts neither: the addon counts them itself, by character, while it runs.
local GuildRuns = {}
ns.GuildRuns = GuildRuns

-- Positions of the instance's type ("party", "pvp") and id among GetInstanceInfo's results (measured in phase 0).
local INSTANCE_TYPE, INSTANCE_ID = 2, 8
local DUNGEON, BATTLEGROUND = "party", "pvp"
-- A battleground's winner, as the game numbers the factions. GetBattlefieldWinner and UnitFactionGroup are not
-- measured on WoW Forever (docs/tests-en-jeu.md): looked up, never called when absent.
local FACTIONS = { Horde = 0, Alliance = 1 }
local WATCH_EVERY_SECONDS = 2

local saved = { runs = {} }
-- The battleground's result was seen: it counts once, until the player leaves.
local settled = false

--- Takes the module's saved data at start-up: the account's characters' runs, by kind.
function GuildRuns.Restore(data)
    saved = data
    saved.runs = type(saved.runs) == "table" and saved.runs or {}
end

--- How many runs of this kind ("dungeons", "battlegrounds") the character made with the guild since VXV counts them.
function GuildRuns.Count(name, kind)
    local counts = name ~= nil and saved.runs[name] or nil
    return counts ~= nil and counts[kind] or 0
end

--- Whether another guild member connected with VXV is in the player's group.
local function withGuildmate()
    local me, online = VXV.PlayerName(), {}
    for _, name in ipairs(VXV.Online()) do
        online[name] = true
    end
    local prefix = IsInRaid() and "raid" or "party"
    for index = 1, GetNumGroupMembers() do
        local name = VXV.NameOfUnit(prefix .. index)
        if name ~= nil and name ~= me and online[name] then
            return true
        end
    end
    return false
end

--- One more run of the kind for the player's character, when a guildmate with VXV was there.
local function count(kind)
    local name = VXV.PlayerName()
    if name == nil or not withGuildmate() then
        return
    end
    saved.runs[name] = saved.runs[name] or {}
    saved.runs[name][kind] = (saved.runs[name][kind] or 0) + 1
    VXV.Emit("quetes.counted")
end

--- The instance the player is in: its type and its id, nil when the client hides them.
local function instance()
    local info = { GetInstanceInfo() }
    local kind, id = info[INSTANCE_TYPE], info[INSTANCE_ID]
    if VXV.IsSecret(kind) or VXV.IsSecret(id) then
        return nil, nil
    end
    return kind, id
end

VXV.OnEvent("ENCOUNTER_END", function(encounterId, _, _, _, success)
    if not (success == 1 or success == true) or VXV.IsSecret(encounterId) then
        return
    end
    local kind, instanceId = instance()
    if kind == DUNGEON and instanceId ~= nil and ns.DUNGEON_LAST_BOSSES[instanceId] == encounterId then
        count("dungeons")
    end
end)

--- Whether the player's faction won the battleground, or nil while it goes on or when the client cannot tell.
local function battlegroundWon()
    local winnerOf, factionOf = VXV.Compat.Resolve("GetBattlefieldWinner"), VXV.Compat.Resolve("UnitFactionGroup")
    if type(winnerOf) ~= "function" or type(factionOf) ~= "function" then
        return nil
    end
    local ok, winner = pcall(winnerOf)
    local known, faction = pcall(factionOf, "player")
    if not ok or not known or VXV.IsSecret(winner) or VXV.IsSecret(faction) or type(winner) ~= "number"
        or FACTIONS[faction] == nil then
        return nil
    end
    return winner == FACTIONS[faction]
end

--- Watches the battleground the player is in: its result counts once, a win with a guildmate.
local function watch()
    if instance() ~= BATTLEGROUND then
        settled = false
    elseif not settled then
        local won = battlegroundWon()
        if won ~= nil then
            settled = true
            if won then
                count("battlegrounds")
            end
        end
    end
    C_Timer.After(WATCH_EVERY_SECONDS, watch)
end

--- Starts watching the battlegrounds.
function GuildRuns.Start()
    watch()
end
