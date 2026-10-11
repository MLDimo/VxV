local ns = select(2, ...).Deathroll

--- The challenged's dialog (P15.1): who challenges, for how much, from which number; accept or refuse within the
--- minute the challenge lasts.
local ChallengeDialog = {}
ns.ChallengeDialog = ChallengeDialog

local Duels = ns.Duels

local Gold, Theme = VXV.Gold, VXV.Theme

local WIDTH, HEIGHT = 380, 190
local BUTTON_WIDTH, BUTTON_HEIGHT, GAP = 150, 30, 12
local ANSWER_SECONDS = 60

local frame, body, text, accept, refuse
local shown

local function answer(accepted)
    if shown ~= nil then
        Duels.Answer(shown, accepted)
        shown = nil
    end
    frame:Hide()
end

local function create()
    frame, body = VXV.CreateDialog("VXV_DeathrollChallenge", WIDTH, HEIGHT, "Défi de deathroll")
    text = Theme.Text(body, "text", 14, "ivory")
    text:SetPoint("TOPLEFT")
    text:SetPoint("TOPRIGHT")
    accept = Theme.Button(body, "gold", "Accepter", BUTTON_WIDTH, BUTTON_HEIGHT)
    accept:SetPoint("BOTTOMRIGHT", body, "BOTTOM", -GAP / 2, 0)
    accept:SetScript("OnClick", function()
        answer(true)
    end)
    refuse = Theme.Button(body, "wood", "Refuser", BUTTON_WIDTH, BUTTON_HEIGHT)
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
    text:SetText(("%s te défie au deathroll pour %s, départ %d.\nLe défié roll le premier : c'est toi."):format(
        challenge.from, Gold.Format(challenge.stake), challenge.start))
    frame:Show()
    C_Timer.After(seconds, function()
        if shown == challenge then
            shown = nil
            frame:Hide()
        end
    end)
end

-- After the player's fight, for the time left: a challenge received during a long one lapses unseen.
VXV.On("deathroll.challenged", function(challenge)
    local receivedAt = GetTime()
    VXV.AfterCombat(function()
        local left = ANSWER_SECONDS - (GetTime() - receivedAt)
        if left > 0 then
            show(challenge, left)
        end
    end)
end)
