local _, ns = ...

--- Le Dé Pipé in the reduced mode (§7.8, tab « Paris »): the bet closing soonest, with its odds and the player's
--- stake, and the button to stake.
local DiceCompact = {}
ns.DiceCompact = DiceCompact

local Bets, BetsData, DiceView, StakeDialog = ns.Bets, ns.BetsData, ns.DiceView, ns.StakeDialog
local RowList = VXV.RowList

local Theme = VXV.Theme

local PADDING = 10
local BUTTON_HEIGHT = 30

local content, list, button
local shownBet

local function render()
    local data = BetsData.Current()
    local bet = Bets.Open(data, time())[1]
    shownBet = bet and bet.id
    list.SetRows(bet == nil and DiceView.Table(data, nil, time(), StakeDialog.Open)
        or DiceView.Bet(bet, Bets.MemberId(data)))
    button:SetShown(bet ~= nil)
end

function DiceCompact.Build(frame)
    content = frame
    local body = CreateFrame("Frame", nil, content)
    body:SetPoint("TOPLEFT", PADDING, -PADDING)
    body:SetSize(content:GetWidth() - 2 * PADDING, content:GetHeight() - 3 * PADDING - BUTTON_HEIGHT)
    list = RowList.Create(body)
    button = Theme.Button(content, "gold", "Miser", content:GetWidth() - 2 * PADDING, BUTTON_HEIGHT)
    button:SetPoint("BOTTOM", 0, PADDING)
    button:SetScript("OnClick", function()
        StakeDialog.Open(shownBet)
    end)
    content:SetScript("OnShow", render)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("paris.updated", refresh)
VXV.On("paris.changes", refresh)
