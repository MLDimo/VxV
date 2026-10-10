local ns = select(2, ...).Raid

--- /vxv importer and the Raid tab's button: an officer pastes the event's text copied from the website.
local Import = {}
ns.Import = Import

local RaidData = ns.RaidData

local PROMPT = "Colle les données copiées depuis la page de l'événement sur le site (Ctrl+V), puis clique sur Charger."

function Import.Open()
    VXV.Print(PROMPT)
    VXV.ShowPasteWindow("Charger", function(text)
        local ok, message = RaidData.Import(text)
        VXV.Print(message)
        if ok then
            VXV.Print("Données envoyées aux membres de la guilde connectés avec VXV.")
        end
        return ok
    end)
end

VXV.RegisterCommand("importer", "charger les données d'un événement copiées depuis le site (officiers)", Import.Open)
