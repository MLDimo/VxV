local _, ns = ...

--- Step 0.6: SavedVariables persistence and Lua files dropped in the addon folder by an external program.
local Util = ns.Util
local log = ns.Log.For("files")

local KILOBYTE = 1024
local FILLER = "x"
local DEFAULT_PAYLOAD_KB = 64

-- Captured at file scope, before the client loads SavedVariables: non-nil only if External\Seed.lua set it.
local seededDb = VXV_ProbeDB

local savedDb

local function checkSeed()
    if seededDb == nil then
        log.Info("seed : External\\Seed.lua vide")
    elseif savedDb == seededDb then
        log.Ok("seed : données d'External\\Seed.lua conservées après ADDON_LOADED")
    else
        log.Fail("seed : données d'External\\Seed.lua remplacées ou effacées par le client")
    end
end

local function checkSavedVariables()
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

local function checkInbox()
    local inbox = VXV_ProbeInbox
    if type(inbox) ~= "table" then
        log.Fail("External\\Inbox.lua non chargé ou invalide")
    elseif inbox.source == "default" then
        log.Info("Inbox : contenu d'origine, pas encore réécrit par le programme externe")
    else
        log.Ok("Inbox : écrit par", inbox.source, "le", Util.FormatTime(inbox.writtenAt), ",",
            #(inbox.payload or ""), "octets lus")
    end
end

local function recordLoad()
    local files = savedDb.files or { loadCount = 0 }
    files.loadCount = files.loadCount + 1
    files.lastLoadAt = time()
    savedDb.files = files
end

local function check()
    checkSeed()
    checkSavedVariables()
    checkInbox()
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
    description = "SavedVariables et fichiers déposés par un programme externe",
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
