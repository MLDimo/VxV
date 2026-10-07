local _, ns = ...

--- The player's stake on a bet, in game (P11.8): a choice and an amount in gold pieces, or the stake taken back;
--- sent to the website as a change (Changes.lua). Filled with the change waiting for the website, else the stake it
--- knows.
local StakeDialog = {}
ns.StakeDialog = StakeDialog

local Bets, BetsData, Changes = ns.Bets, ns.BetsData, ns.Changes

local Theme = VXV.Theme

local WIDTH, HEIGHT = 480, 330
local TITLE_HEIGHT, HEADING_GAP, TOGGLE_GAP, SECTION_GAP = 40, 22, 6, 12
local TOGGLE_HEIGHT = 32
local AMOUNT_WIDTH, BUTTON_WIDTH, BUTTON_HEIGHT, WITHDRAW_WIDTH = 120, 140, 30, 160
-- Gold pieces: nine digits at most.
local AMOUNT_LETTERS = 9
local MIN_STAKE = 1
local MISSING_CHOICE = "Choisis sur quoi tu mises."
local BAD_AMOUNT = "Mise en pièces d'or entières, 1 po au moins."
local CLOSED = "Ce pari est fermé."
local UNLINKED = "Ce personnage n'est lié à aucun membre sur le site : lie-le avec /vxv_main ou /vxv_reroll."

local frame, body, title, choicesArea, amountHolder, amountBox, problem, withdraw
local toggles = {}
local betId, chosen

local function show()
    for _, toggle in ipairs(toggles) do
        toggle:SetSelected(toggle.choiceId == chosen)
    end
end

--- One toggle per choice, wrapping to the next row when the line is full.
local function layoutChoices(bet)
    for _, toggle in ipairs(toggles) do
        toggle:Hide()
    end
    local x, y = 0, 0
    for index, choice in ipairs(bet.choices) do
        local toggle = toggles[index]
        if toggle == nil then
            toggle = Theme.Tab(choicesArea, "")
            toggle:SetScript("OnClick", function(self)
                chosen = self.choiceId
                show()
            end)
            toggles[index] = toggle
        end
        toggle.label:SetText(choice.label)
        toggle:SetWidth(toggle.label:GetStringWidth() + 2 * TOGGLE_GAP + 16)
        if x > 0 and x + toggle:GetWidth() > choicesArea:GetWidth() then
            x, y = 0, y + TOGGLE_HEIGHT
        end
        toggle:ClearAllPoints()
        toggle:SetPoint("TOPLEFT", x, -y)
        toggle.choiceId = choice.id
        toggle:Show()
        x = x + toggle:GetWidth() + TOGGLE_GAP
    end
    show()
end

local function currentBet()
    local data = BetsData.Current()
    return data ~= nil and data.byId[betId] or nil
end

local function send()
    local amount = tonumber((amountBox:GetText() or ""):match("^%s*(.-)%s*$"))
    if chosen == nil then
        problem:SetText(MISSING_CHOICE)
    elseif amount == nil or amount < MIN_STAKE or amount ~= math.floor(amount) then
        problem:SetText(BAD_AMOUNT)
    elseif Changes.Place(betId, chosen, amount) then
        frame:Hide()
    end
end

local function takeBack()
    if Changes.Withdraw(betId) then
        frame:Hide()
    end
end

local function build()
    frame, body = VXV.CreateDialog("VXV_StakeDialog", WIDTH, HEIGHT, "Miser")
    title = Theme.Text(body, "pixelBold", 16, "ivory")
    title:SetPoint("TOPLEFT")
    title:SetPoint("RIGHT")
    local choicesHeading = Theme.Heading(body, "Mon choix")
    choicesHeading:SetPoint("TOPLEFT", 0, -TITLE_HEIGHT)
    choicesArea = CreateFrame("Frame", nil, body)
    choicesArea:SetPoint("TOPLEFT", 0, -(TITLE_HEIGHT + HEADING_GAP))
    choicesArea:SetSize(body:GetWidth(), 2 * TOGGLE_HEIGHT)
    local amountHeading = Theme.Heading(body, "Mise (po)")
    amountHeading:SetPoint("TOPLEFT", choicesArea, "BOTTOMLEFT", 0, -SECTION_GAP)
    amountHolder, amountBox = Theme.Field(body, AMOUNT_WIDTH, AMOUNT_LETTERS)
    amountHolder:SetPoint("TOPLEFT", amountHeading, "BOTTOMLEFT", 0, -TOGGLE_GAP)
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + SECTION_GAP)
    problem:SetPoint("RIGHT")
    local button = Theme.Button(body, "gold", "Miser", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
    withdraw = Theme.Button(body, "wood", "Retirer ma mise", WITHDRAW_WIDTH, BUTTON_HEIGHT)
    withdraw:SetPoint("BOTTOMLEFT")
    withdraw:SetScript("OnClick", takeBack)
end

--- Opens the stake on this bet, filled with the player's change or stake; says why when it cannot be.
function StakeDialog.Open(id)
    betId = id
    local bet, data = currentBet(), BetsData.Current()
    if bet == nil or not Bets.IsOpen(bet, time()) then
        VXV.Print(CLOSED)
        return
    end
    local memberId = VXV.MemberOf(data)
    if memberId == nil then
        VXV.Print(UNLINKED)
        return
    end
    if frame == nil then
        build()
    end
    local pending, stake = Changes.Pending(bet.id), Bets.StakeOf(bet, memberId)
    local current = pending ~= nil and pending.kind == "stake" and pending or stake
    chosen = current and current.choiceId
    title:SetText(bet.title)
    layoutChoices(bet)
    amountBox:SetText(current and tostring(current.amount) or "")
    problem:SetText("")
    withdraw:SetShown(stake ~= nil and stake.standing == "toPay" or (pending ~= nil and pending.kind == "stake"))
    frame:Show()
end
