local ns = select(2, ...).Fishing

--- The character's fishing profession: fishing in one button is only for a character who fishes (owner's decision of
--- 8 November).
local Skill = {}
ns.Skill = Skill

local Compat = VXV.Compat

-- The fishing spell's ranks in Classic: apprentice, journeyman, expert, artisan. Casting the apprentice's name casts
-- the best rank the character knows.
Skill.SPELL = 7620
Skill.SPELLS = { [7620] = true, [7731] = true, [7732] = true, [18248] = true }
-- The fishing profession's skill line (measured on 7 October).
local FISHING_SKILL_LINE = 356

--- How many values a call returned, and them: GetProfessions' slots vary on WoW Forever (its order is not the
--- usual one, measured on 3 October).
local function results(...)
    return select("#", ...), { ... }
end

--- The character's fishing { level, max } from the list of professions, or { } when the character knows the fishing
--- spell but the list does not tell its level; nil when the character does not fish.
function Skill.Read()
    local count, slots = results(Compat.GetProfessions())
    for slot = 2, slots[1] and count or 0 do
        local index = slots[slot]
        if index ~= nil then
            local ok, _, _, level, max, _, _, skillLine = Compat.GetProfessionInfo(index)
            if ok and skillLine == FISHING_SKILL_LINE and type(level) == "number" and type(max) == "number" then
                return { level = level, max = max }
            end
        end
    end
    local ok, known = Compat.IsPlayerSpell(Skill.SPELL)
    if ok and known == true then
        return {}
    end
end
