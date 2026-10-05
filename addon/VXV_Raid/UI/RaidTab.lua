local _, ns = ...

--- The Raid screen (§7.1): the head with its badges, then three columns: my sign-up and the officers' zone, the
--- composition and the raid's soft reserves, my soft reserves and the last loots.
local RaidTab = {}
ns.RaidTab = RaidTab

local Import, Invitations, LogExport, RaidData = ns.Import, ns.Invitations, ns.LogExport, ns.RaidData
local RaidLog, RaidView, RowList = ns.RaidLog, ns.RaidView, ns.RowList

local Theme = VXV.Theme

local PADDING, GAP = 22, 16
local GRID_TOP = 96
-- Columns of 270 and 300 pixels around the composition (§7.1); in each, the share of its first panel.
local LEFT, RIGHT = 270, 300
local SMALL_SHARE, COMPOSITION_SHARE = 0.4, 0.6
local PANEL_PADDING, PANEL_TITLE = 14, 40
local BUTTON_HEIGHT, BUTTON_GAP, JOIN_HEIGHT = 24, 6, 30
local BADGE_HEIGHT, BADGE_PADDING, BADGE_ALPHA = 24, 16, 0.14

local content, header
local lists, buttons, badges = {}, {}, {}
local officerPanel
-- The officers' buttons, top to bottom.
local OFFICER_ACTIONS = { "import", "open", "inviteAll", "export" }

--- A panel of the grid with its title; returns the panel and the frame under the title.
local function addPanel(x, y, width, height, title, officer)
    local panel = Theme.Panel(content, officer)
    panel:SetPoint("TOPLEFT", x, -y)
    panel:SetSize(width, height)
    local heading = Theme.Text(panel, "pixel", 16, "ivory")
    heading:SetPoint("TOPLEFT", PANEL_PADDING, -12)
    heading:SetText(title)
    local body = CreateFrame("Frame", nil, panel)
    body:SetPoint("TOPLEFT", PANEL_PADDING, -PANEL_TITLE)
    body:SetSize(width - 2 * PANEL_PADDING, height - PANEL_TITLE - PANEL_PADDING)
    return panel, body
end

local function addBadge(index)
    local badge = CreateFrame("Frame", nil, content)
    badge:SetHeight(BADGE_HEIGHT)
    badge.background = badge:CreateTexture(nil, "BACKGROUND")
    badge.background:SetAllPoints()
    badge.label = Theme.Text(badge, "textHeavy", 12, "gain")
    badge.label:SetPoint("CENTER")
    badges[index] = badge
    return badge
end

local function renderHeader()
    local _, sender = RaidData.Text()
    local view = RaidView.Header(RaidData.Current(), sender, time())
    header.kicker:SetText(Theme.Upper(view.kicker))
    header.title:SetText(view.title)
    header.subtitle:SetText(view.subtitle)
    local right = -PADDING
    for index = 1, math.max(#view.badges, #badges) do
        local data = view.badges[index]
        local badge = badges[index] or addBadge(index)
        badge:SetShown(data ~= nil)
        if data ~= nil then
            local r, g, b = Theme.Color(data.color)
            badge.background:SetColorTexture(r, g, b, BADGE_ALPHA)
            badge.label:SetTextColor(r, g, b, 1)
            badge.label:SetText(data.text)
            badge:SetWidth(badge.label:GetStringWidth() + BADGE_PADDING)
            badge:ClearAllPoints()
            badge:SetPoint("TOPRIGHT", right, -PADDING)
            right = right - badge:GetWidth() - BUTTON_GAP
        end
    end
end

--- Which buttons the player sees, and their texts; the officers' shown buttons stacked.
local function updateButtons()
    local player, leader = VXV.PlayerName(), Invitations.Leader()
    local isOfficer = RaidData.IsOfficer(player)
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
    lists.raidReserves.SetRows(RaidView.RaidReserves(event))
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

local function addHeader()
    header = {}
    header.kicker, header.title = Theme.ScreenHeader(content, "", "sakura", "")
    header.kicker:SetPoint("TOPLEFT", PADDING, -PADDING)
    header.subtitle = Theme.Text(content, "text", 13, "muted")
    header.subtitle:SetPoint("TOPLEFT", header.title, "BOTTOMLEFT", 0, -6)
end

local function addOfficerPanel(x, y, height)
    local body
    officerPanel, body = addPanel(x, y, LEFT, height, "Officier", true)
    local actions = {
        import = { "Charger les données", Import.Open },
        open = { "Ouvrir les invitations", Invitations.Toggle },
        inviteAll = { "Inviter tout le roster", Invitations.InviteAll },
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
    addHeader()
    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local center = width - 2 * PADDING - LEFT - RIGHT - 2 * GAP
    local x2, x3 = PADDING + LEFT + GAP, PADDING + LEFT + GAP + center + GAP
    --- Heights of a column's two panels, the first taking this share.
    local function split(share)
        local first = math.floor(height * share)
        return first, height - first - GAP
    end

    local meHeight, officerHeight = split(SMALL_SHARE)
    local mePanel, meBody = addPanel(PADDING, GRID_TOP, LEFT, meHeight, "Mon inscription")
    lists.me = RowList.Create(meBody)
    buttons.join = Theme.Button(mePanel, "pixel", "Rejoindre le raid", LEFT - 2 * PANEL_PADDING, JOIN_HEIGHT)
    buttons.join:SetPoint("BOTTOM", 0, PANEL_PADDING)
    buttons.join:SetScript("OnClick", Invitations.Join)
    addOfficerPanel(PADDING, GRID_TOP + meHeight + GAP, officerHeight)

    local compositionHeight, reservesHeight = split(COMPOSITION_SHARE)
    local _, compositionBody = addPanel(x2, GRID_TOP, center, compositionHeight, "Composition")
    lists.composition = RowList.Create(compositionBody)
    local _, reservesBody = addPanel(x2, GRID_TOP + compositionHeight + GAP, center, reservesHeight, "SR du raid")
    lists.raidReserves = RowList.Create(reservesBody)

    local myHeight, lootsHeight = split(SMALL_SHARE)
    local _, myBody = addPanel(x3, GRID_TOP, RIGHT, myHeight, "Mes SR")
    lists.myReserves = RowList.Create(myBody)
    local _, lootsBody = addPanel(x3, GRID_TOP + myHeight + GAP, RIGHT, lootsHeight, "Derniers loots")
    lists.loots = RowList.Create(lootsBody)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("raid.updated", refresh)
VXV.On("raid.invitations", refresh)
VXV.On("raid.log", refresh)
