local ns = select(2, ...).Raid

--- The event's data as the website exports it for the addon: contract VXV-RAID-5, described line by line in
--- packages/server/src/domain/addonExport.ts; read by the core's site data (RaidData.lua).
local EventData = {}
ns.EventData = EventData

local FLAG_ON = "1"

local function split(text)
    local list = {}
    for value in text:gmatch("[^,]+") do
        list[#list + 1] = value
    end
    return list
end

local function reserves(text)
    local list = {}
    for itemId, bonus in text:gmatch("(%d+):(%d+)") do
        list[#list + 1] = { itemId = tonumber(itemId), bonus = tonumber(bonus) }
    end
    return list
end

--- The format, for the core's site data (VXV.SiteData): the header, why another text is refused, the empty event,
--- and each kind of line with its number of fields and how it adds to the event (the officers' O lines are the
--- core's).
EventData.FORMAT = {
    header = "VXV-RAID-5",
    wrong = "Ce texte n'est pas une donnée d'événement : copie-la depuis la page de l'événement sur le site.",
    New = function()
        return { items = {}, itemOrder = {}, wearers = {}, signups = {}, journal = {}, results = {} }
    end,
    lines = {
        -- E;id;start;export;soft reserves per player;title;raid ids;who may sign up
        E = { 7, function(event, f)
            event.id, event.title, event.raidIds, event.audience = f[1], f[5], split(f[6]), f[7]
            event.startsAt, event.exportedAt = tonumber(f[2]), tonumber(f[3])
            event.softReservesPerPlayer = tonumber(f[4])
            return event.startsAt ~= nil and event.exportedAt ~= nil and event.softReservesPerPlayer ~= nil
        end },
        -- I;item id;name;boss;1 when excluded from soft reserves
        I = { 4, function(event, f)
            local id = tonumber(f[1])
            if id == nil then
                return false
            end
            event.items[id] = { id = id, name = f[2], boss = f[3], excluded = f[4] == FLAG_ON }
            event.itemOrder[#event.itemOrder + 1] = id
            return true
        end },
        -- W;item id;the class tokens that may equip it
        W = { 2, function(event, f)
            local id = tonumber(f[1])
            if id == nil then
                return false
            end
            event.wearers[id] = {}
            for _, class in ipairs(split(f[2])) do
                event.wearers[id][class] = true
            end
            return true
        end },
        -- S;character;class;role;status;1 for a reroll;spec;reserves
        S = { 7, function(event, f)
            event.signups[#event.signups + 1] = { name = f[1], class = f[2], role = f[3], status = f[4],
                reroll = f[5] == FLAG_ON, spec = f[6], reserves = reserves(f[7]) }
            return true
        end },
        -- U;character;the item ids of its last raid's reserves it may reuse
        U = { 2, function(event, f)
            local signup = EventData.SignupOf(event, f[1])
            if signup == nil then
                return false
            end
            signup.reusable = {}
            for _, itemId in ipairs(split(f[2])) do
                signup.reusable[#signup.reusable + 1] = tonumber(itemId)
            end
            return true
        end },
        -- J;time;actor;summary;reason
        J = { 4, function(event, f)
            local at = tonumber(f[1])
            if at == nil then
                return false
            end
            event.journal[#event.journal + 1] = { at = at, actor = f[2], summary = f[3], reason = f[4] }
            return true
        end },
        -- C;change id;1 when done;message
        C = { 3, function(event, f)
            event.results[f[1]] = { accepted = f[2] == FLAG_ON, message = f[3] }
            return true
        end },
    },
}

--- Whether a character of this class may equip the item, as the website knows it: every class may when the
--- website does not restrict the item, or when the class is unknown.
function EventData.CanEquip(event, itemId, class)
    local wearers = event and event.wearers[itemId]
    return wearers == nil or class == nil or wearers[class] == true
end

--- The sign-up of the character named "Prénom Nom", or nil.
function EventData.SignupOf(event, name)
    for _, signup in ipairs(event and event.signups or {}) do
        if signup.name == name then
            return signup
        end
    end
end
