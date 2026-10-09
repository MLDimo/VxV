local _, ns = ...

--- The charter in game (docs/design/VXV_Design_Spec.md): colors from the generated tokens, the class colors, the
--- two fonts as font families (the game's own fonts for Chinese and Korean, measured on 5 October), and the pixel
--- frames: rings of solid color stacked around a frame, bevelled buttons, panels and tabs.
local Theme = {}
ns.Theme = Theme

local Compat, Tokens = ns.Compat, ns.Tokens

local MEDIA = "Interface\\AddOns\\VXV_Core\\Media\\"
Theme.MEDIA = MEDIA

local FONT_FILES = {
    pixel = MEDIA .. "Fonts\\PixelifySans-SemiBold.ttf",
    pixelBold = MEDIA .. "Fonts\\PixelifySans-Bold.ttf",
    text = MEDIA .. "Fonts\\Manrope-Regular.ttf",
    textBold = MEDIA .. "Fonts\\Manrope-Bold.ttf",
    textHeavy = MEDIA .. "Fonts\\Manrope-ExtraBold.ttf",
}
-- Our fonts have Latin and Cyrillic (Pixelify lacks the capital О, kept by the owner's choice); the game's fonts
-- write the other alphabets of the guild's names.
local OWN_ALPHABETS = { "roman", "russian" }
local GAME_ALPHABETS = { "korean", "simplifiedchinese", "traditionalchinese" }
local NO_OUTLINE = ""

local families = {}
local preloader

--- Red, green, blue and alpha of a token ("amethyst", "wood"…), between 0 and 1.
function Theme.Color(name)
    return unpack(Tokens.colors[name])
end

--- The class color as RRGGBB: the game's own, else the charter's (same values), else the secondary text color.
function Theme.ClassHex(token)
    local colors = Compat.Resolve("RAID_CLASS_COLORS")
    local color = type(colors) == "table" and colors[token]
    if type(color) == "table" and type(color.colorStr) == "string" then
        return color.colorStr:sub(-6)
    end
    return Tokens.classColors[token] or Tokens.unknownClassColor
end

local CHANNEL = 255

--- Red, green and blue of a class color, between 0 and 1: a banner's cloth (§7.5), a portrait's frame (§8).
function Theme.ClassColor(token)
    local hex = Theme.ClassHex(token)
    return tonumber(hex:sub(1, 2), 16) / CHANNEL, tonumber(hex:sub(3, 4), 16) / CHANNEL,
        tonumber(hex:sub(5, 6), 16) / CHANNEL
end

--- RRGGBB of a token, for the |cff…|r codes of a font string.
function Theme.Hex(name)
    local r, g, b = Theme.Color(name)
    return string.format("%02x%02x%02x", math.floor(r * CHANNEL + 0.5), math.floor(g * CHANNEL + 0.5),
        math.floor(b * CHANNEL + 0.5))
end

--- The text in a token's color, for a font string.
function Theme.Colored(text, name)
    return "|cff" .. Theme.Hex(name) .. text .. "|r"
end

-- Dimmed names (late players, §7.1) keep 55 % of their color over the window's background.
local DIMMED = 0.55

local function dim(hex)
    local background = { Theme.Color("night-window") }
    local parts = {}
    for index = 1, 3 do
        local channel = tonumber(hex:sub(index * 2 - 1, index * 2), 16) / CHANNEL
        local mixed = channel * DIMMED + background[index] * (1 - DIMMED)
        parts[index] = string.format("%02x", math.floor(mixed * CHANNEL + 0.5))
    end
    return table.concat(parts)
end

--- The name in the color of its class, for a font string; dimmed for a late player.
function Theme.ClassColored(name, token, dimmed)
    local hex = Theme.ClassHex(token)
    return "|cff" .. (dimmed and dim(hex) or hex) .. name .. "|r"
end

--- The name in the color of its class darkened toward the parchment's ink, to be read on parchment (§7.4).
function Theme.ParchmentClassColored(name, token)
    return "|cff" .. (Tokens.classColorsOnParchment[token] or Tokens.unknownClassColorOnParchment) .. name .. "|r"
end

--- Starts loading the font files when the addon loads: the client loads them in the background, and a font set
--- before it is ready stays blank (measured on 5 October).
function Theme.Preload()
    preloader = preloader or UIParent:CreateFontString(nil, "OVERLAY")
    for _, file in pairs(FONT_FILES) do
        preloader:SetFont(file, 12, NO_OUTLINE)
    end
end

local function gameFont(alphabet)
    local ok, fontObject = pcall(GameFontNormal.GetFontObjectForAlphabet, GameFontNormal, alphabet)
    if ok and fontObject ~= nil then
        return (fontObject:GetFont())
    end
end

--- A font object for one of our fonts (pixel, pixelBold, text, textBold, textHeavy) at a size, made once.
function Theme.Font(style, size)
    local name = "VXVFont_" .. style .. "_" .. size
    if families[name] ~= nil then
        return families[name]
    end
    local members = {}
    for _, alphabet in ipairs(OWN_ALPHABETS) do
        members[#members + 1] = { alphabet = alphabet, file = FONT_FILES[style], height = size, flags = NO_OUTLINE }
    end
    for _, alphabet in ipairs(GAME_ALPHABETS) do
        local file = gameFont(alphabet)
        if file ~= nil then
            members[#members + 1] = { alphabet = alphabet, file = file, height = size, flags = NO_OUTLINE }
        end
    end
    local ok, family = pcall(CreateFontFamily, name, members)
    families[name] = ok and family or GameFontNormal
    return families[name]
end

--- A font string in one of our fonts and a token's color.
function Theme.Text(parent, style, size, color, layer)
    local fontString = parent:CreateFontString(nil, layer or "OVERLAY")
    fontString:SetFontObject(Theme.Font(style, size))
    fontString:SetTextColor(Theme.Color(color or "lavender"))
    fontString:SetJustifyH("LEFT")
    return fontString
end

--- A solid rectangle of a token's color.
function Theme.Fill(frame, color, layer)
    local texture = frame:CreateTexture(nil, layer or "BACKGROUND")
    texture:SetColorTexture(Theme.Color(color))
    return texture
end

--- Draws rings of solid color around the frame, like stacked box-shadows (§3): { { color, size }, … }, from the
--- frame outwards; inside = true draws them inwards from the frame's edge. Returns the rings' textures by ring,
--- to recolor them (hover).
function Theme.Rings(frame, rings, inside)
    local drawn, offset = {}, 0
    local direction = inside and -1 or 1
    for index, ring in ipairs(rings) do
        local color, size = ring[1], ring[2]
        local near, far = offset * direction, (offset + size) * direction
        local edges = {}
        for side = 1, 4 do
            edges[side] = Theme.Fill(frame, color, "BORDER")
        end
        local outer, inner = math.max(near, far), math.min(near, far)
        edges[1]:SetPoint("TOPLEFT", -outer, outer)
        edges[1]:SetPoint("BOTTOMRIGHT", frame, "TOPRIGHT", outer, inner)
        edges[2]:SetPoint("TOPLEFT", frame, "BOTTOMLEFT", -outer, -inner)
        edges[2]:SetPoint("BOTTOMRIGHT", outer, -outer)
        edges[3]:SetPoint("TOPLEFT", -outer, inner)
        edges[3]:SetPoint("BOTTOMRIGHT", frame, "BOTTOMLEFT", -inner, -inner)
        edges[4]:SetPoint("TOPLEFT", frame, "TOPRIGHT", inner, inner)
        edges[4]:SetPoint("BOTTOMRIGHT", outer, -inner)
        drawn[index] = edges
        offset = offset + size
    end
    return drawn
end

--- Gives every texture of a ring a token's color.
function Theme.Recolor(edges, color)
    for _, edge in ipairs(edges) do
        edge:SetColorTexture(Theme.Color(color))
    end
end

-- A text field: its height, and the margin of its text.
--- A section's heading in a form (§3): bold, lavender; placed by its caller.
function Theme.Heading(parent, text)
    local label = Theme.Text(parent, "textBold", 13, "lavender")
    label:SetText(text)
    return label
end

local FIELD_HEIGHT, FIELD_PADDING = 26, 6
Theme.FIELD_HEIGHT = FIELD_HEIGHT

--- A text field on a dark ground with a thin ring, the text in our font; returns its frame (to place, of the given
--- width) and its edit box. Escape and Enter leave it.
function Theme.Field(parent, width, maxLetters)
    local holder = CreateFrame("Frame", nil, parent)
    holder:SetSize(width, FIELD_HEIGHT)
    Theme.Fill(holder, "night"):SetAllPoints()
    Theme.Rings(holder, { { "line", 1 } }, true)
    local box = CreateFrame("EditBox", nil, holder)
    box:SetPoint("TOPLEFT", FIELD_PADDING, 0)
    box:SetPoint("BOTTOMRIGHT", -FIELD_PADDING, 0)
    box:SetFontObject(Theme.Font("text", 13))
    box:SetAutoFocus(false)
    box:SetMaxLetters(maxLetters)
    box:SetScript("OnEscapePressed", box.ClearFocus)
    box:SetScript("OnEnterPressed", box.ClearFocus)
    return holder, box
end

--- A panel (§3): dark background, ink then wood rings; the officers' panel has a gold ring.
function Theme.Panel(parent, officer)
    local panel = CreateFrame("Frame", nil, parent)
    Theme.Fill(panel, officer and "panel-officer" or "panel"):SetAllPoints()
    Theme.Rings(panel, { { "ink", 2 }, { officer and "gold" or "beam", 2 } })
    return panel
end

-- A titled panel's margins around its content, and the room of its title above.
local PANEL_PADDING, PANEL_TITLE, PANEL_HEADING_TOP = 14, 40, 12
Theme.PANEL_PADDING = PANEL_PADDING

--- A panel of a screen's grid with its title, at x, y of the parent; its style is nil, "officer" (§3, gold edge)
--- or "parchment" (§7.4, the quest of the week). Returns the panel, the frame under its title, and the title.
function Theme.TitledPanel(parent, x, y, width, height, title, style)
    local panel = Theme.Panel(parent, style == "officer")
    panel:SetPoint("TOPLEFT", x, -y)
    panel:SetSize(width, height)
    if style == "parchment" then
        Theme.Fill(panel, "parchment", "BORDER"):SetAllPoints()
    end
    local heading = Theme.Text(panel, "pixel", 16, style == "parchment" and "ink-brown" or "ivory")
    heading:SetPoint("TOPLEFT", PANEL_PADDING, -PANEL_HEADING_TOP)
    heading:SetText(title)
    local body = CreateFrame("Frame", nil, panel)
    body:SetPoint("TOPLEFT", PANEL_PADDING, -PANEL_TITLE)
    body:SetSize(width - 2 * PANEL_PADDING, height - PANEL_TITLE - PANEL_PADDING)
    return panel, body, heading
end

-- Bevelled buttons (§3): background, light and dark edges inside, ink ring outside; hover in plum, gold ring.
local BUTTONS = {
    pixel = { background = "amethyst-button", light = "amethyst-light", shade = "amethyst-shade", text = "ivory",
        bevel = 3, ring = 2 },
    wood = { background = "wood", light = "copper", shade = "wood-shade", text = "parchment", bevel = 3, ring = 2 },
    gold = { background = "gold", light = "gold-light", shade = "gold-shade", text = "ink", bevel = 4, ring = 3 },
}
local BUTTON_FONT_SIZE = 15

local function bevel(button, style)
    local sides = {}
    for index, color in ipairs({ style.light, style.light, style.shade, style.shade }) do
        sides[index] = Theme.Fill(button, color, "BORDER")
    end
    local size = style.bevel
    sides[1]:SetPoint("TOPLEFT")
    sides[1]:SetPoint("BOTTOMRIGHT", button, "TOPRIGHT", 0, -size)
    sides[2]:SetPoint("TOPLEFT")
    sides[2]:SetPoint("BOTTOMRIGHT", button, "BOTTOMLEFT", size, 0)
    sides[3]:SetPoint("TOPLEFT", button, "BOTTOMLEFT", 0, size)
    sides[3]:SetPoint("BOTTOMRIGHT")
    sides[4]:SetPoint("TOPLEFT", button, "TOPRIGHT", -size, 0)
    sides[4]:SetPoint("BOTTOMRIGHT")
end

--- A button of the charter: style pixel (main action), wood (secondary; textColor gold for an officer's) or gold.
function Theme.Button(parent, styleName, text, width, height, textColor)
    local style = BUTTONS[styleName]
    local button = CreateFrame("Button", nil, parent)
    button:SetSize(width, height)
    local background = Theme.Fill(button, style.background)
    background:SetAllPoints()
    bevel(button, style)
    local ring = Theme.Rings(button, { { "ink", style.ring } })[1]
    local label = Theme.Text(button, "pixel", BUTTON_FONT_SIZE, textColor or style.text)
    label:SetPoint("CENTER")
    label:SetJustifyH("CENTER")
    button.label = label
    function button:SetText(value)
        label:SetText(value)
    end
    button:SetText(text)
    button:SetScript("OnEnter", function()
        background:SetColorTexture(Theme.Color("plum"))
        Theme.Recolor(ring, "gold")
    end)
    button:SetScript("OnLeave", function()
        background:SetColorTexture(Theme.Color(style.background))
        Theme.Recolor(ring, "ink")
    end)
    return button
end

-- A small wood button on the right of a panel's title.
local TITLE_BUTTON_WIDTH, TITLE_BUTTON_HEIGHT, TITLE_BUTTON_TOP = 104, 22, 9

--- A small wood button on the right of a titled panel's title, its text in gold for an officer's action.
function Theme.TitleButton(panel, text, run, textColor)
    local button = Theme.Button(panel, "wood", text, TITLE_BUTTON_WIDTH, TITLE_BUTTON_HEIGHT, textColor)
    button:SetPoint("TOPRIGHT", -PANEL_PADDING, -TITLE_BUTTON_TOP)
    button:SetScript("OnClick", run)
    return button
end

-- Tabs (§3): wood, plum and a gold underline when selected.
local TAB_HEIGHT, TAB_FONT_SIZE, TAB_UNDERLINE, TAB_PADDING = 36, 15, 3, 24

--- A tab of the window's header; tab:SetSelected(selected).
function Theme.Tab(parent, text)
    local tab = CreateFrame("Button", nil, parent)
    local background = Theme.Fill(tab, "wood-tab")
    background:SetAllPoints()
    local underline = Theme.Fill(tab, "wood-shade", "BORDER")
    underline:SetPoint("BOTTOMLEFT")
    underline:SetPoint("BOTTOMRIGHT")
    underline:SetHeight(TAB_UNDERLINE)
    Theme.Rings(tab, { { "ink", 2 } })
    local label = Theme.Text(tab, "pixel", TAB_FONT_SIZE, "old-paper")
    label:SetPoint("CENTER")
    label:SetText(text)
    tab:SetSize(math.max(label:GetStringWidth(), 0) + TAB_PADDING, TAB_HEIGHT)
    tab.label = label
    function tab:SetSelected(selected)
        background:SetColorTexture(Theme.Color(selected and "plum" or "wood-tab"))
        underline:SetColorTexture(Theme.Color(selected and "gold" or "wood-shade"))
        label:SetTextColor(Theme.Color(selected and "ivory" or "old-paper"))
    end
    tab:SetSelected(false)
    return tab
end

-- Lua's upper case leaves accented letters alone: French ones, two bytes each in UTF-8.
local ACCENTED_CAPITALS = { ["à"] = "À", ["â"] = "Â", ["ç"] = "Ç", ["é"] = "É", ["è"] = "È", ["ê"] = "Ê",
    ["ë"] = "Ë", ["î"] = "Î", ["ï"] = "Ï", ["ô"] = "Ô", ["ù"] = "Ù", ["û"] = "Û", ["ü"] = "Ü" }

--- The text in capitals, French accents included ("Forge & métiers" → "FORGE & MÉTIERS").
function Theme.Upper(text)
    return (text:upper():gsub("\195[\128-\191]", ACCENTED_CAPITALS))
end
