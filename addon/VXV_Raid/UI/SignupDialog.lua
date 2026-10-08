local _, ns = ...

--- "Mon inscription" in game (P7.5): the core's dialog for the current event's sign-up of the player's character,
--- sent to the website as a change (Changes.lua). Filled with the change waiting for the website, else the sign-up it
--- knows.
local SignupDialog = {}
ns.SignupDialog = SignupDialog

local Changes, EventData, RaidData = ns.Changes, ns.EventData, ns.RaidData

--- Opens the dialog for the current event's sign-up of the player's character.
function SignupDialog.Open()
    local event, player = RaidData.Current(), VXV.PlayerName()
    if event == nil or player == nil then
        return
    end
    VXV.OpenSignupDialog({
        subtitle = "Personnage : " .. player .. " · " .. event.title,
        current = Changes.Pending("signup") or EventData.SignupOf(event, player),
        send = function(signup)
            return Changes.Submit({ kind = "signup", role = signup.role, spec = signup.spec, status = signup.status })
        end,
    })
end
