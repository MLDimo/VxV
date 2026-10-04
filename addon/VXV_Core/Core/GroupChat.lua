local _, ns = ...

--- Announcements in the group's channel (raid, or party), for the players without the addon. The client refuses
--- chat during a boss encounter (measured in phase 0): announcements wait for its end. A text longer than a chat
--- message is cut between words, never inside a character.
local GroupChat = {}
ns.GroupChat = GroupChat

local Compat, Events = ns.Compat, ns.Events

local MAX_MESSAGE_BYTES = 255
local PREFIX = "[VXV] "

local waiting = {}
local inEncounter = false

--- Pieces of at most maxBytes bytes, cut at the last space when there is one; a UTF-8 character stays whole.
function GroupChat.Split(text, maxBytes)
    local pieces = {}
    while #text > maxBytes do
        local cut = maxBytes
        -- Bytes 0x80 to 0xBF continue a character: never cut right before one.
        while cut > 1 and text:byte(cut + 1) ~= nil and text:byte(cut + 1) >= 0x80 and text:byte(cut + 1) < 0xC0 do
            cut = cut - 1
        end
        local space = text:sub(1, cut):match("^.*() ")
        if space ~= nil and space > 1 then
            cut = space - 1
        end
        pieces[#pieces + 1] = text:sub(1, cut)
        text = text:sub(cut + 1):gsub("^ +", "")
    end
    pieces[#pieces + 1] = text
    return pieces
end

local function channel()
    if IsInRaid() then
        return "RAID"
    end
    return IsInGroup() and "PARTY" or nil
end

local function send(text)
    local target = channel()
    if target == nil then
        return
    end
    for _, piece in ipairs(GroupChat.Split(PREFIX .. text, MAX_MESSAGE_BYTES)) do
        Compat.SendChatMessage(piece, target)
    end
end

--- Writes the text in the group's channel, now or right after the boss encounter.
function GroupChat.Say(text)
    if inEncounter then
        waiting[#waiting + 1] = text
    else
        send(text)
    end
end

Events.On("ENCOUNTER_START", function()
    inEncounter = true
end)

Events.On("ENCOUNTER_END", function()
    inEncounter = false
    local texts = waiting
    waiting = {}
    for _, text in ipairs(texts) do
        send(text)
    end
end)
