local _, ns = ...

--- The PvP screen, on the wall of wanted posters: the head with the player's Elo, the outings to come (where an
--- officer creates one), the duels (where a member challenges another) and the Elo ranking.
local PvpTab = {}
ns.PvpTab = PvpTab

local DuelActions, DuelDialog, OutingDialog = ns.DuelActions, ns.DuelDialog, ns.OutingDialog
local PvpData, PvpView = ns.PvpData, ns.PvpView
local RowList, Screen, Theme = VXV.RowList, VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local OUTINGS_WIDTH, RANKING_WIDTH = 300, 260

local content, header, badges, createButton
local lists = {}

--- « Mon inscription » to an outing: the core's dialog, sent as a change.
local function signUp(outing)
    local player = VXV.PlayerName()
    if player == nil then
        return
    end
    local current = ns.Changes.Pending("signup", outing.id)
    for _, signup in ipairs(outing.signups) do
        current = current or (signup.name == player and signup or nil)
    end
    VXV.OpenSignupDialog({
        subtitle = "Personnage : " .. player .. " · " .. outing.title,
        current = current,
        send = function(signup)
            return ns.Changes.Submit({ kind = "signup", eventId = outing.id, role = signup.role, spec = signup.spec,
                status = signup.status })
        end,
    })
end

local function render()
    local data = PvpData.Current()
    local memberId = VXV.MemberOf(data)
    local view = PvpView.Header(data, memberId)
    header.subtitle:SetText(view.subtitle)
    badges.Set(view.badges)
    lists.outings.SetRows(PvpView.Outings(data, VXV.PlayerName(), signUp))
    lists.duels.SetRows(PvpView.Duels(data, memberId, DuelActions.Open))
    lists.ranking.SetRows(PvpView.Ranking(data))
    createButton:SetShown(PvpData.IsOfficer(VXV.PlayerName()))
end

function PvpTab.Build(frame)
    content = frame
    header = Screen.Head(content, "Avis de recherche", "loss", "PvP")
    badges = Screen.Badges(content)

    local width, height = content:GetWidth(), content:GetHeight() - GRID_TOP - PADDING
    local duelsWidth = width - 2 * PADDING - OUTINGS_WIDTH - RANKING_WIDTH - 2 * GAP
    local outings, outingsBody = Theme.TitledPanel(content, PADDING, GRID_TOP, OUTINGS_WIDTH, height, "Sorties")
    lists.outings = RowList.Create(outingsBody, 0)
    createButton = Theme.TitleButton(outings, "Créer", OutingDialog.Open, "gold")
    local duelsX = PADDING + OUTINGS_WIDTH + GAP
    local duels, duelsBody = Theme.TitledPanel(content, duelsX, GRID_TOP, duelsWidth, height, "Duels")
    lists.duels = RowList.Create(duelsBody, 0)
    Theme.TitleButton(duels, "Défier", DuelDialog.Open, "gold")
    lists.ranking = RowList.Panel(content, duelsX + duelsWidth + GAP, GRID_TOP, RANKING_WIDTH, height, "Classement")
    Screen.Follow(content, render, { "pvp.updated", "pvp.changes" })
end
