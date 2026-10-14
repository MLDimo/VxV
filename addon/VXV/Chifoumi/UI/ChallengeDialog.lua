local ns = select(2, ...).Chifoumi

--- The challenged's dialog: who challenges, for how much; accept or refuse within the minute the challenge lasts.
--- Received during a fight, it shows once the fight is over, for the time left.
local ChallengeDialog = {}
ns.ChallengeDialog = ChallengeDialog

local Matches = ns.Matches

local Gold, Theme = VXV.Gold, VXV.Theme

local WIDTH, HEIGHT = 380, 170
local BUTTON_WIDTH, BUTTON_HEIGHT, GAP = 150, 30, 12
local ANSWER_SECONDS = 60

local frame, body, text
local shown

local function answer(accepted)
    if shown ~= nil then
        Matches.Answer(shown, accepted)
        shown = nil
    end
    frame:Hide()
end

local function create()
    frame, body = VXV.CreateDialog("VXV_ChifoumiChallenge", WIDTH, HEIGHT, "Défi de Chi Fou Mi")
    text = Theme.Text(body, "text", 14, "ivory")
    text:SetPoint("TOPLEFT")
    text:SetPoint("TOPRIGHT")
    local accept = Theme.Button(body, "gold", "Accepter", BUTTON_WIDTH, BUTTON_HEIGHT)
    accept:SetPoint("BOTTOMRIGHT", body, "BOTTOM", -GAP / 2, 0)
    accept:SetScript("OnClick", function()
        answer(true)
    end)
    local refuse = Theme.Button(body, "wood", "Refuser", BUTTON_WIDTH, BUTTON_HEIGHT)
    refuse:SetPoint("BOTTOMLEFT", body, "BOTTOM", GAP / 2, 0)
    refuse:SetScript("OnClick", function()
        answer(false)
    end)
end

--- Shows the challenge for the seconds left to answer it.
local function show(challenge, seconds)
    if frame == nil then
        create()
    end
    shown = challenge
    text:SetText(("%s te défie au Chi Fou Mi pour %s, au meilleur des trois manches."):format(challenge.from,
        Gold.Format(challenge.stake)))
    frame:Show()
    C_Timer.After(seconds, function()
        if shown == challenge then
            shown = nil
            frame:Hide()
        end
    end)
end

VXV.On("chifoumi.challenged", function(challenge)
    local receivedAt = GetTime()
    VXV.AfterCombat(function()
        local left = ANSWER_SECONDS - (GetTime() - receivedAt)
        if left > 0 then
            show(challenge, left)
        end
    end)
end)
