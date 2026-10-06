local _, ns = ...

--- The titles of the week as this player's addon shows them: those the member of a character holds, and how they read.
local Titles = {}
ns.Titles = Titles

local TitlesData = ns.TitlesData
local Theme = VXV.Theme

local MARK = "◆ "
local COLOR = "sakura-light"
local SEPARATOR = " · "

--- The names of the titles the member of this character ("Prénom Nom") holds, in the website's order.
function Titles.Of(name)
    local data, held = TitlesData.Current(), {}
    if data == nil or VXV.IsSecret(name) or type(name) ~= "string" or data.members[name] == nil then
        return held
    end
    for _, title in ipairs(data.titles) do
        if title.memberId == data.members[name] then
            held[#held + 1] = title.name
        end
    end
    return held
end

--- "◆ Roi du gambling", in the titles' color.
function Titles.Label(name)
    return Theme.Colored(MARK .. name, COLOR)
end

--- Every title of a character, for their messages and their name in the guild list: "[◆ A · ◆ B]" in the titles'
--- color, or nil without any.
function Titles.Tag(name)
    local held = Titles.Of(name)
    if #held == 0 then
        return nil
    end
    for index, title in ipairs(held) do
        held[index] = MARK .. title
    end
    return Theme.Colored("[" .. table.concat(held, SEPARATOR) .. "]", COLOR)
end
