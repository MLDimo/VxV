local _, ns = ...

--- Step 0.6: SavedVariables persistence, after /reload and after a restart.
local Util = ns.Util
local log = ns.Log.For("files")

local KILOBYTE = 1024
local FILLER = "x"
local DEFAULT_PAYLOAD_KB = 64

local savedDb

local function check()
    local files = savedDb.files
    if not files then
        log.Info("SavedVariables : rien de relu (normal au tout premier lancement, sinon la relecture échoue)")
        return
    end
    log.Ok("SavedVariables relues : chargement n°", files.loadCount, "précédent le", Util.FormatTime(files.lastLoadAt))
    if files.payloadSize then
        local actualSize = files.payload and #files.payload or 0
        log.Check(actualSize == files.payloadSize, "bloc de test :", actualSize, "/", files.payloadSize, "octets relus")
    end
end

local function recordLoad()
    local files = savedDb.files or { loadCount = 0 }
    files.loadCount = files.loadCount + 1
    files.lastLoadAt = time()
    savedDb.files = files
end

local function writePayload(args)
    local kilobytes = tonumber(args) or DEFAULT_PAYLOAD_KB
    local files = savedDb.files
    files.payload = FILLER:rep(kilobytes * KILOBYTE)
    files.payloadSize = #files.payload
    log.Info("bloc de", kilobytes, "Ko préparé : taper /reload puis /vxvtest files check")
end

ns.Registry.Register({
    id = "files",
    description = "SavedVariables relues après /reload et redémarrage",
    Setup = function(db)
        savedDb = db
        check()
        recordLoad()
    end,
    commands = {
        { name = "check", run = check },
        { name = "payload", usage = "[Ko]", run = writePayload },
    },
})
