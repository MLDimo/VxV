local _, ns = ...

--- Le Dé Pipé's Deathroll tab (P15): challenge a member connected with VXV, follow the games being played, the
--- player's debts (the winner confirms the payment here), and the ranking.
local DeathrollTab = {}
ns.DeathrollTab = DeathrollTab

local DeathrollData, Duels, DuelWindow, Games = ns.DeathrollData, ns.Duels, ns.DuelWindow, ns.Games

local Gold, RowList, Theme = VXV.Gold, VXV.RowList, VXV.Theme

local PADDING, GAP = 22, 16
local GRID_TOP = 96
local LEFT = 340
local FIELD_WIDTH, FIELD_LETTERS = 110, 7
local BUTTON_HEIGHT = 30
-- Under the list of members: the stake, the starting number, the button and the answer.
local FORM_HEIGHT = 112
local TOP_SHARE = 0.5

local content, lists, form = nil, {}, {}
local target

local function row(kind, text, onClick)
    return { kind = kind, text = text, onClick = onClick }
end

--- The members connected with VXV the player may challenge, the one chosen marked.
local function members()
    local rows, me = {}, VXV.PlayerName()
    for _, name in ipairs(VXV.Online()) do
        if name ~= me then
            rows[#rows + 1] = row("line", (name == target and "▸ " or "") .. name, function()
                target = name
                lists.members.SetRows(members())
            end)
        end
    end
    return #rows > 0 and rows or { row("line", "Aucun autre membre connecté avec VXV.") }
end

local function live()
    local rows = {}
    for _, game in ipairs(Games.Live()) do
        rows[#rows + 1] = row("line", ("%s contre %s · %s"):format(game.challenged, game.challenger,
            Gold.Format(game.stake)), function()
            DuelWindow.Show(game.id)
        end)
    end
    return #rows > 0 and rows or { row("line", "Aucune partie en cours.") }
end

local function debts()
    local rows, me = {}, VXV.PlayerName()
    for _, game in ipairs(Games.Unpaid()) do
        if game.loser == me then
            rows[#rows + 1] = row("line", ("Tu dois %s à %s."):format(Gold.Format(game.stake), game.winner))
        elseif game.winner == me then
            rows[#rows + 1] = row("line", ("%s te doit %s : clique une fois payé."):format(game.loser,
                Gold.Format(game.stake)), function()
                Duels.ConfirmPaid(game.id)
            end)
        end
    end
    return #rows > 0 and rows or { row("line", "Aucune dette de deathroll.") }
end

--- The deathroll's ranking since always, as the website exports it (P15.7).
function DeathrollTab.Ranking()
    local data, rows = DeathrollData.Current(), {}
    for _, entry in ipairs(data and data.ranking or {}) do
        rows[#rows + 1] = row("line", ("%d. %s · %s · %d parties"):format(entry.rank,
            VXV.ClassColored(entry.name, entry.class), Gold.Signed(entry.net), entry.games))
    end
    return #rows > 0 and rows or { row("line", "Le classement arrive avec les données du site.") }
end

local function render()
    lists.members.SetRows(members())
    lists.live.SetRows(live())
    lists.debts.SetRows(debts())
    lists.ranking.SetRows(DeathrollTab.Ranking())
end

local function challenge()
    local refusal = Duels.Challenge(target, form.stake:GetText(), form.start:GetText())
    form.answer:SetText(refusal or ("Défi envoyé à %s : une minute pour répondre."):format(target))
end

--- The challenge's panel: the members to choose from, then the stake, the starting number and the button.
local function addChallenge(height)
    local _, body = Theme.TitledPanel(content, PADDING, GRID_TOP, LEFT, height, "Défier un membre")
    local list = CreateFrame("Frame", nil, body)
    list:SetPoint("TOPLEFT")
    list:SetSize(body:GetWidth(), body:GetHeight() - FORM_HEIGHT)
    lists.members = RowList.Create(list)
    local stakeLabel = Theme.Text(body, "text", 12, "lavender")
    stakeLabel:SetPoint("BOTTOMLEFT", 0, FORM_HEIGHT - 20)
    stakeLabel:SetText("Mise (po)")
    local stakeHolder
    stakeHolder, form.stake = Theme.Field(body, FIELD_WIDTH, FIELD_LETTERS)
    stakeHolder:SetPoint("TOPLEFT", stakeLabel, "BOTTOMLEFT", 0, -4)
    local startLabel = Theme.Text(body, "text", 12, "lavender")
    startLabel:SetPoint("LEFT", stakeLabel, "LEFT", FIELD_WIDTH + GAP, 0)
    startLabel:SetText("Départ")
    local startHolder
    startHolder, form.start = Theme.Field(body, FIELD_WIDTH, FIELD_LETTERS)
    startHolder:SetPoint("TOPLEFT", startLabel, "BOTTOMLEFT", 0, -4)
    form.start:SetText(tostring(Duels.DEFAULT_START))
    local button = Theme.Button(body, "gold", "Défier", body:GetWidth(), BUTTON_HEIGHT)
    button:SetPoint("BOTTOMLEFT", 0, 18)
    button:SetScript("OnClick", challenge)
    form.answer = Theme.Text(body, "text", 11, "muted")
    form.answer:SetPoint("BOTTOMLEFT")
end

function DeathrollTab.Build(frame)
    content = frame
    local kicker, title = Theme.ScreenHeader(content, "La salle de jeu", "neon", "Deathroll")
    kicker:SetPoint("TOPLEFT", PADDING, -PADDING)
    local subtitle = Theme.Text(content, "text", 13, "muted")
    subtitle:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -6)
    subtitle:SetText("Le défié roll le premier, puis chacun de 1 au résultat précédent : qui fait 1 perd la mise.")
    local height = content:GetHeight() - GRID_TOP - PADDING
    local topHeight = math.floor(height * TOP_SHARE)
    addChallenge(topHeight)
    lists.debts = RowList.Panel(content, PADDING, GRID_TOP + topHeight + GAP, LEFT, height - topHeight - GAP,
        "Mes dettes")
    local x, width = PADDING + LEFT + GAP, content:GetWidth() - 2 * PADDING - LEFT - GAP
    lists.live = RowList.Panel(content, x, GRID_TOP, width, topHeight, "Parties en cours")
    lists.ranking = RowList.Panel(content, x, GRID_TOP + topHeight + GAP, width, height - topHeight - GAP,
        "Classement")
    content:SetScript("OnShow", render)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("deathroll.updated", refresh)
VXV.On("presence.changed", refresh)
