local _, ns = ...

--- Design step 3: can the addon show the charter in game? Fonts of our own (TTF), textures (TGA and PNG, pixel
--- sharp, in a 2048x1024 texture), player names in other alphabets, an additive pulsing glow; and does the client
--- give the class colors, race and sex. A board shows everything; the journal keeps what the client answered.
local Util = ns.Util
local log = ns.Log.For("design")

local MEDIA = "Interface\\AddOns\\VXV_Probe\\Media\\"
local PIXEL_FONT = MEDIA .. "PixelifySans-SemiBold.ttf"
local TEXT_FONT = MEDIA .. "Manrope-Regular.ttf"
local WIDTH, HEIGHT = 900, 600
local TAVERN_WIDTH, TAVERN_HEIGHT = 420, 178
-- The tavern (1588x672) sits in the middle of a 2048x1024 texture: 230 pixels left and right, 176 above and below.
local TAVERN_COORDS = { 230 / 2048, 1818 / 2048, 176 / 1024, 848 / 1024 }
local D20_SIZE = 96
local LINE = 24
local PULSE_STEPS = { 0.55, 0.8, 0.6, 0.9 }
local STEP_SECONDS = 0.4
-- Names of the beta guild in each alphabet, and the French words of the interface.
local SAMPLES = { "Le Dé Pipé · Ðéjà Vu · 37/40", "Скуф Обыкновеный", "白白 肥肥", "힐잉 힐잉" }
local ALPHABETS = { "roman", "russian", "korean", "simplifiedchinese", "traditionalchinese" }

local board

local function label(parent, text, x, y)
    local fontString = parent:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    fontString:SetPoint("TOPLEFT", x, y)
    fontString:SetText(text)
    return fontString
end

local function addTexture(parent, path, width, height, x, y, coords)
    local texture = parent:CreateTexture(nil, "ARTWORK")
    texture:SetSize(width, height)
    texture:SetPoint("TOPLEFT", x, y)
    local ok, result = pcall(texture.SetTexture, texture, path, nil, nil, "NEAREST")
    log.Check(ok and result ~= false, "texture", path, ok and tostring(result) or result)
    if coords ~= nil then
        texture:SetTexCoord(unpack(coords))
    end
    return texture
end

--- A text line in our own font, the font loaded or not (SetFont answers false when it cannot).
local function ownFontLine(parent, font, size, text, x, y)
    local fontString = parent:CreateFontString(nil, "OVERLAY")
    local ok, loaded = pcall(fontString.SetFont, fontString, font, size, "")
    log.Check(ok and loaded ~= false, "police", font, size, ok and tostring(loaded) or loaded)
    fontString:SetPoint("TOPLEFT", x, y)
    fontString:SetText(text)
end

--- The game's font file for an alphabet, read from one of its font objects.
local function gameFontFor(alphabet)
    local ok, fontObject = pcall(GameFontNormal.GetFontObjectForAlphabet, GameFontNormal, alphabet)
    if not ok or fontObject == nil then
        return nil
    end
    return (fontObject:GetFont())
end

--- A font family: our Pixelify Sans for Latin and Cyrillic, the game's fonts for the other alphabets.
local function pixelFamily()
    if type(CreateFontFamily) ~= "function" then
        log.Fail("CreateFontFamily absente")
        return nil
    end
    local members = {}
    for _, alphabet in ipairs(ALPHABETS) do
        local own = alphabet == "roman" or alphabet == "russian"
        local file = own and PIXEL_FONT or gameFontFor(alphabet)
        log.Info("famille de polices :", alphabet, "→", Util.Safe(file))
        if file ~= nil then
            members[#members + 1] = { alphabet = alphabet, file = file, height = 16, flags = "" }
        end
    end
    local ok, family = pcall(CreateFontFamily, "VXVProbePixelFamily", members)
    log.Check(ok and family ~= nil, "CreateFontFamily", ok and tostring(family) or family)
    return ok and family or nil
end

local function addGlow(parent, x, y)
    local glow = addTexture(parent, MEDIA .. "d20.png", D20_SIZE, D20_SIZE, x, y)
    glow:SetBlendMode("ADD")
    if type(glow.CreateAnimationGroup) ~= "function" then
        log.Fail("CreateAnimationGroup absente")
        return
    end
    local group = glow:CreateAnimationGroup()
    for index, alpha in ipairs(PULSE_STEPS) do
        local step = group:CreateAnimation("Alpha")
        step:SetFromAlpha(alpha)
        step:SetToAlpha(alpha)
        step:SetDuration(STEP_SECONDS)
        step:SetOrder(index)
    end
    group:SetLooping("REPEAT")
    group:Play()
    log.Ok("lueur additive animée en 4 paliers")
end

local function create()
    board = CreateFrame("Frame", nil, UIParent)
    board:SetSize(WIDTH, HEIGHT)
    board:SetPoint("CENTER")
    board:SetFrameStrata("DIALOG")
    board:EnableMouse(true)
    board:SetMovable(true)
    board:RegisterForDrag("LeftButton")
    board:SetScript("OnDragStart", board.StartMoving)
    board:SetScript("OnDragStop", board.StopMovingOrSizing)
    local background = board:CreateTexture(nil, "BACKGROUND")
    background:SetAllPoints()
    background:SetColorTexture(14 / 255, 10 / 255, 22 / 255, 0.95)

    label(board, "TGA", 16, -12)
    addTexture(board, MEDIA .. "taverne.tga", TAVERN_WIDTH, TAVERN_HEIGHT, 16, -30, TAVERN_COORDS)
    label(board, "PNG", 464, -12)
    addTexture(board, MEDIA .. "taverne.png", TAVERN_WIDTH, TAVERN_HEIGHT, 464, -30, TAVERN_COORDS)

    local top = -30 - TAVERN_HEIGHT - 12
    addTexture(board, MEDIA .. "d20.tga", D20_SIZE, D20_SIZE, 16, top)
    addTexture(board, MEDIA .. "d20.png", D20_SIZE, D20_SIZE, 128, top)
    addGlow(board, 240, top)
    label(board, "d20 TGA · d20 PNG · lueur additive", 352, top - 8)

    local family = pixelFamily()
    local y = top - D20_SIZE - 16
    for _, sample in ipairs(SAMPLES) do
        ownFontLine(board, PIXEL_FONT, 16, sample, 16, y)
        ownFontLine(board, TEXT_FONT, 14, sample, 232, y)
        local game = board:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
        game:SetPoint("TOPLEFT", 448, y)
        game:SetText(sample)
        if family ~= nil then
            local mixed = board:CreateFontString(nil, "OVERLAY")
            mixed:SetFontObject(family)
            mixed:SetPoint("TOPLEFT", 664, y)
            mixed:SetText(sample)
        end
        y = y - LINE
    end
    label(board, "Pixelify · Manrope · police du jeu · famille mixte", 16, y - 4)
end

local function status()
    local colors = type(RAID_CLASS_COLORS) == "table" and RAID_CLASS_COLORS.WARRIOR
    log.Info("RAID_CLASS_COLORS.WARRIOR :", colors and Util.Safe(colors.colorStr) or "absent")
    log.Info("C_ClassColor.GetClassColor :", type(C_ClassColor) == "table" and type(C_ClassColor.GetClassColor)
        or "absent")
    for _, name in ipairs({ "UnitRace", "UnitSex", "UnitClass" }) do
        local fn = _G[name]
        if type(fn) == "function" then
            log.Info(name .. '("player") :', Util.Safe((select(1, fn("player")))), Util.Safe((select(2, fn("player")))))
        else
            log.Fail(name, "absente")
        end
    end
    log.Info("écran", Util.Safe(GetScreenWidth()), "x", Util.Safe(GetScreenHeight()), "échelle",
        Util.Safe(UIParent:GetEffectiveScale()))
end

local function toggle()
    if board == nil then
        status()
        create()
        board:Show()
        log.Info("planche affichée : fais une capture d'écran, puis /reload pour garder le journal")
        return
    end
    board:SetShown(not board:IsShown())
end

ns.Registry.Register({
    id = "design",
    description = "habillage : polices, textures, alphabets, couleurs de classe, race et sexe",
    commands = {
        { name = "show", run = toggle },
        { name = "status", run = status },
    },
})
