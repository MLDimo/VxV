local _, ns = ...

--- The officers' export of the current raid's record for the website (VXV-LOG-2): the Raid screen's button and
--- /vxv journal.
local LogExport = {}
ns.LogExport = LogExport

local RaidLog = ns.RaidLog

local READY = "Journal du raid prêt : Ctrl+C, puis colle-le sur la page de l'événement du site (officiers)."
local NOTHING = "Rien à exporter : aucun raid enregistré pour l'événement chargé."

function LogExport.Open()
    local log = RaidLog.Current()
    if log == nil or (#log.kills == 0 and #log.loots == 0) then
        VXV.Print(NOTHING)
        return
    end
    VXV.ShowCopyWindow(RaidLog.Export(log))
    VXV.Print(READY)
end

VXV.RegisterCommand("journal", "exporter le journal du raid pour le site (officiers)", LogExport.Open)
