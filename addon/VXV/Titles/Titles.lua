local ns = select(2, ...).Titles

--- The titles of the week as this player's addon shows them: those the member of a character holds, and how they read.
local Titles = {}
ns.Titles = Titles

local TitlesData = ns.TitlesData
local Theme = VXV.Theme

local COLOR = "sakura-light"

--- The one title shown for the member of this character ("Prénom Nom"), or nil: of those they hold, the first in the
--- website's order, the most stylish (owner's choice of 26 November).
function Titles.Of(name)
    local data = TitlesData.Current()
    if data == nil or VXV.IsSecret(name) or type(name) ~= "string" or data.members[name] == nil then
        return nil
    end
    for _, title in ipairs(data.titles) do
        if title.memberId == data.members[name] then
            return title.name
        end
    end
end

--- "Roi du gambling", in the titles' color.
function Titles.Label(name)
    return Theme.Colored(name, COLOR)
end

--- A character's title, for their messages and their name in the guild list: "[A]" in the titles' color, or nil
--- without any.
function Titles.Tag(name)
    local title = Titles.Of(name)
    return title and Theme.Colored("[" .. title .. "]", COLOR)
end
