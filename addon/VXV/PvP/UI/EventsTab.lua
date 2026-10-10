local ns = select(2, ...).PvP

--- The PvP place's « Événements » tab: the PvP events to come, each signed up from its title, where an officer creates
--- one.
local EventsTab = {}
ns.EventsTab = EventsTab

local Changes, OutingDialog, PvpData, PvpView = ns.Changes, ns.OutingDialog, ns.PvpData, ns.PvpView
local RowList, Screen, Theme = VXV.RowList, VXV.Screen, VXV.Theme

local PADDING, GRID_TOP = Screen.PADDING, Screen.GRID_TOP

--- « Mon inscription » to an event: the core's dialog, sent as a change.
local function signUp(outing)
    local player = VXV.PlayerName()
    if player == nil then
        return
    end
    local current = Changes.Pending("signup", outing.id)
    for _, signup in ipairs(outing.signups) do
        current = current or (signup.name == player and signup or nil)
    end
    VXV.OpenSignupDialog({
        subtitle = "Personnage : " .. player .. " · " .. outing.title,
        current = current,
        send = function(signup)
            return Changes.Submit({ kind = "signup", eventId = outing.id, role = signup.role, spec = signup.spec,
                status = signup.status })
        end,
    })
end

function EventsTab.Build(content)
    local header = Screen.Head(content, "Avis de recherche", "loss", "Événements PvP")
    local badges = Screen.Badges(content)
    local width, height = content:GetWidth() - 2 * PADDING, content:GetHeight() - GRID_TOP - PADDING
    local panel, body = Theme.TitledPanel(content, PADDING, GRID_TOP, width, height, "Événements PvP")
    local list = RowList.Create(body, 0)
    local createButton = Theme.TitleButton(panel, "Créer", OutingDialog.Open, "gold")
    Screen.Follow(content, function()
        local data = PvpData.Current()
        local view = PvpView.Header(data, VXV.MemberOf(data))
        header.subtitle:SetText(view.subtitle)
        badges.Set(view.badges)
        list.SetRows(PvpView.Outings(data, VXV.PlayerName(), signUp))
        createButton:SetShown(PvpData.IsOfficer(VXV.PlayerName()))
    end, { "pvp.updated", "pvp.changes" })
end
