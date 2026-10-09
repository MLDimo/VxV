local _, ns = ...

--- An entry of the hall of fame (§7.4, P12.7) in its gold frame: place, name, quests won with a star, then gold won
--- and mean place, over a gold dashed line.
local HallOfFame = {}
ns.HallOfFame = HallOfFame

local Parchment = ns.Parchment

local Theme = VXV.Theme

HallOfFame.HEIGHT = 44
local NAME_LEFT, WINS_WIDTH, STAR_SIZE, STAR_GAP, DETAIL_TOP, LINE_ALPHA = 16, 40, 13, 4, 20, 0.25

--- An entry of this width, to place; entry:Set({ rank, name, wins, detail }).
function HallOfFame.Entry(parent, width)
    local entry = CreateFrame("Frame", nil, parent)
    entry:SetSize(width, HallOfFame.HEIGHT)
    entry.rank = Theme.Text(entry, "pixel", 13, "muted")
    entry.rank:SetPoint("TOPLEFT")
    entry.name = Theme.Text(entry, "textBold", 14, "ivory")
    entry.name:SetPoint("TOPLEFT", NAME_LEFT, 0)
    entry.name:SetWidth(width - NAME_LEFT - WINS_WIDTH)
    entry.name:SetWordWrap(false)
    local star = Parchment.Star(entry, STAR_SIZE)
    star:SetPoint("TOPRIGHT")
    entry.wins = Theme.Text(entry, "pixel", 13, "gold")
    entry.wins:SetPoint("TOPRIGHT", -(STAR_SIZE + STAR_GAP), 0)
    entry.wins:SetJustifyH("RIGHT")
    entry.detail = Theme.Text(entry, "text", 11, "old-paper")
    entry.detail:SetPoint("TOPLEFT", 0, -DETAIL_TOP)
    entry.detail:SetWidth(width)
    entry.detail:SetWordWrap(false)
    Parchment.Dashes(entry, "gold", LINE_ALPHA, width):SetPoint("BOTTOMLEFT")
    function entry:Set(fame)
        self.rank:SetText(tostring(fame.rank))
        self.name:SetText(fame.name)
        self.wins:SetText(fame.wins)
        self.detail:SetText(fame.detail)
    end
    return entry
end
