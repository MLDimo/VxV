local _, ns = ...

--- The Raid screen (§7.1): the head with its badges, then three columns: my sign-up and the officers' zone, the
--- composition and the raid's soft reserves, my soft reserves and the last loots.
local RaidTab = {}
ns.RaidTab = RaidTab

local BossAlert, Choices, EventData, Import = ns.BossAlert, ns.Choices, ns.EventData, ns.Import
local EventDialog, Invitations = ns.EventDialog, ns.Invitations
local LogExport, RaidData, RaidLog, RaidView = ns.LogExport, ns.RaidData, ns.RaidLog, ns.RaidView
local RowList, SignupDialog = VXV.RowList, ns.SignupDialog

local Screen, Theme = VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
-- Columns of 270 and 300 pixels around the composition (§7.1); in each, the share of its first panel.
local LEFT, RIGHT = 270, 300
local SMALL_SHARE, COMPOSITION_SHARE = 0.4, 0.6
local PANEL_PADDING = Theme.PANEL_PADDING
local BUTTON_HEIGHT, BUTTON_GAP, JOIN_HEIGHT = 24, 6, 30
-- The small button on the right of a panel's title (§7.1: « Changer »).

local content, header
local lists, buttons, badges = {}, {}, nil
local officerPanel
-- The officers' buttons, top to bottom.
local OFFICER_ACTIONS = { "import", "open", "inviteAll", "exclusions", "create", "export" }

local function renderHeader()
    local _, sender = RaidData.Text()
    local view = RaidView.Header(RaidData.Current(), sender, time())
    header.kicker:SetText(Theme.Upper(view.kicker))
    header.title:SetText(view.title)
    header.subtitle:SetText(view.subtitle)
    badges.Set(view.badges)
end

--- Which buttons the player sees, and their texts; the officers' shown buttons stacked.
local function updateButtons()
    local player, leader, event = VXV.PlayerName(), Invitations.Leader(), RaidData.Current()
    local isOfficer = RaidData.IsOfficer(player)
    -- Signing up closes when the raid starts, as on the website.
    buttons.signup:SetShown(event ~= nil and time() < event.startsAt)
    buttons.signup:SetText(EventData.SignupOf(event, player) and "Changer" or "M'inscrire")
    buttons.reserves:SetShown(Choices.CanReserve(event, player))
    buttons.exclusions:SetShown(isOfficer)
    buttons.alert:SetText(BossAlert.IsOn() and "Alerte : oui" or "Alerte : non")
    -- Anybody may load the first data: refused unless the website names them officer.
    officerPanel:SetShown(RaidData.Current() == nil or isOfficer)
    buttons.open:SetShown(isOfficer and (leader == nil or leader == player))
    buttons.open:SetText(leader == player and "Fermer les invitations" or "Ouvrir les invitations")
    buttons.inviteAll:SetShown(isOfficer)
    buttons.export:SetShown(isOfficer)
    buttons.join:SetShown(leader ~= nil and leader ~= player)
    local top = 0
    for _, key in ipairs(OFFICER_ACTIONS) do
        local button = buttons[key]
        button:ClearAllPoints()
        button:SetPoint("TOPLEFT", 0, -top)
        top = top + (button:IsShown() and BUTTON_HEIGHT + BUTTON_GAP or 0)
    end
end

local function render()
    local event, player = RaidData.Current(), VXV.PlayerName()
    renderHeader()
    lists.me.SetRows(RaidView.Me(event, player))
    lists.composition.SetRows(RaidView.Composition(event))
    -- The next boss first (P8.2), then the whole raid's reserves.
    local raidRows = RaidView.NextBoss(event, player)
    if #raidRows > 0 then
        raidRows[#raidRows + 1] = { kind = "header", text = "Tout le raid" }
    end
    for _, extra in ipairs(RaidView.RaidReserves(event)) do
        raidRows[#raidRows + 1] = extra
    end
    lists.raidReserves.SetRows(raidRows)
    lists.myReserves.SetRows(RaidView.MyReserves(event, player))
    lists.loots.SetRows(RaidView.LastLoots(RaidLog.Current()))
    local requests = RaidView.Requests(Invitations.Requests())
    for _, request in ipairs(requests) do
        request.onClick = function()
            Invitations.Invite(request.invite)
        end
    end
    lists.requests.SetRows(requests)
    updateButtons()
end

local function addOfficerPanel(x, y, height)
    local body
    officerPanel, body = Theme.TitledPanel(content, x, y, LEFT, height, "Officier", "officer")
    local actions = {
        import = { "Charger les données", Import.Open },
        open = { "Ouvrir les invitations", Invitations.Toggle },
        inviteAll = { "Inviter tout le roster", Invitations.InviteAll },
        exclusions = { "Exclure des objets", Choices.Exclusions },
        create = { "Créer un événement", EventDialog.Open },
        export = { "Exporter le journal du raid", LogExport.Open },
    }
    for _, key in ipairs(OFFICER_ACTIONS) do
        local text, run = actions[key][1], actions[key][2]
        buttons[key] = Theme.Button(body, "wood", text, body:GetWidth(), BUTTON_HEIGHT, "gold")
        buttons[key]:SetScript("OnClick", run)
    end
    lists.requests = RowList.Create(body, #OFFICER_ACTIONS * (BUTTON_HEIGHT + BUTTON_GAP))
end

function RaidTab.Build(frame)
    content = frame
    header = Screen.Head(content, "", "sakura", "")
    badges = Screen.Badges(content)
    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local center = width - 2 * PADDING - LEFT - RIGHT - 2 * GAP
    local x2, x3 = PADDING + LEFT + GAP, PADDING + LEFT + GAP + center + GAP
    --- Heights of a column's two panels, the first taking this share.
    local function split(share)
        local first = math.floor(height * share)
        return first, height - first - GAP
    end

    local meHeight, officerHeight = split(SMALL_SHARE)
    local mePanel, meBody = Theme.TitledPanel(content, PADDING, GRID_TOP, LEFT, meHeight, "Mon inscription")
    lists.me = RowList.Create(meBody, 0, nil, JOIN_HEIGHT + BUTTON_GAP)
    buttons.join = Theme.Button(mePanel, "pixel", "Rejoindre le raid", LEFT - 2 * PANEL_PADDING, JOIN_HEIGHT)
    buttons.join:SetPoint("BOTTOM", 0, PANEL_PADDING)
    buttons.join:SetScript("OnClick", Invitations.Join)
    buttons.signup = Theme.TitleButton(mePanel, "M'inscrire", SignupDialog.Open)
    addOfficerPanel(PADDING, GRID_TOP + meHeight + GAP, officerHeight)

    local compositionHeight, reservesHeight = split(COMPOSITION_SHARE)
    local _, compositionBody = Theme.TitledPanel(content, x2, GRID_TOP, center, compositionHeight, "Composition")
    lists.composition = RowList.Create(compositionBody)
    local reservesPanel, reservesBody = Theme.TitledPanel(content, x2, GRID_TOP + compositionHeight + GAP, center,
        reservesHeight, "SR du raid")
    lists.raidReserves = RowList.Create(reservesBody)
    buttons.alert = Theme.TitleButton(reservesPanel, "Alerte : oui", BossAlert.Toggle)

    local myHeight, lootsHeight = split(SMALL_SHARE)
    local myPanel, myBody = Theme.TitledPanel(content, x3, GRID_TOP, RIGHT, myHeight, "Mes SR")
    lists.myReserves = RowList.Create(myBody)
    buttons.reserves = Theme.TitleButton(myPanel, "Choisir", Choices.Reserves)
    local _, lootsBody = Theme.TitledPanel(content, x3, GRID_TOP + myHeight + GAP, RIGHT, lootsHeight, "Derniers loots")
    lists.loots = RowList.Create(lootsBody)
    -- What depends on the time (the lock, the start) is up to date each time the screen shows.
    Screen.Follow(content, render,
        { "raid.updated", "raid.invitations", "raid.log", "raid.changes", "raid.alert", "raid.place" })
end
