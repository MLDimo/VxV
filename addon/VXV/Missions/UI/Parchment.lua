local ns = select(2, ...).Missions

--- The quests' parchments pinned to the board (§7.4): a sheet of parchment in its ink and copper rings, its amethyst
--- pin, the guild's seal, the stamp of an ended quest; and a stack of them scrolled with the mouse wheel.
local Parchment = {}
ns.Parchment = Parchment

local Theme = VXV.Theme

local MEDIA = "Interface\\AddOns\\VXV\\Missions\\Media\\"
local RINGS = { { "ink", 2 }, { "copper", 2 } }
-- An ended quest's parchment, faded (saturate .75, brightness .9).
local FADED = { 0.9, 0.86, 0.8 }
local PIN_SIZE, PIN_BEVEL, PIN_RISE = 12, 2, 6
-- The seal's picture holds the 72-pixel seal turned, with room around it; the stamps' hold their margins.
local SEAL_SIZE, SEAL_MARGIN = 96, 12
local STAMP_WIDTHS = { closed = 108, ended = 102 }
local STAMP_HEIGHT = 37
local STAMP_FILES = { closed = "quest-accomplished.png", ended = "quest-pending.png" }
-- What the rings draw outside a sheet, and the pin above it: room a stack keeps around its sheets.
local OVERFLOW = 4
-- A dashed line: its pattern repeated, 4 pixels drawn then 4 left.
local DASH_PATTERN = 8

--- A picture of the part's media on the frame.
local function picture(frame, file, layer)
    local texture = frame:CreateTexture(nil, layer or "ARTWORK")
    texture:SetTexture(MEDIA .. file)
    return texture
end

--- A sheet of parchment of this size (its place set by its caller); faded for an ended quest.
function Parchment.Sheet(parent, width, height)
    local sheet = CreateFrame("Frame", nil, parent)
    sheet:SetSize(width, height)
    sheet.paper = picture(sheet, "parchment.png", "BACKGROUND")
    sheet.paper:SetAllPoints()
    Theme.Rings(sheet, RINGS)
    function sheet:SetFaded(faded)
        if faded then
            self.paper:SetVertexColor(FADED[1], FADED[2], FADED[3], 1)
        else
            self.paper:SetVertexColor(1, 1, 1, 1)
        end
    end
    return sheet
end

--- The amethyst pin holding the sheet to the board, astride its top edge.
function Parchment.Pin(sheet)
    local pin = CreateFrame("Frame", nil, sheet)
    pin:SetSize(PIN_SIZE, PIN_SIZE)
    pin:SetPoint("TOP", 0, PIN_RISE)
    Theme.Fill(pin, "amethyst"):SetAllPoints()
    Theme.Rings(pin, { { "ink", 2 } })
    local light, shade = Theme.Fill(pin, "amethyst-light", "ARTWORK"), Theme.Fill(pin, "amethyst-shade", "ARTWORK")
    light:SetPoint("TOPLEFT")
    light:SetSize(PIN_SIZE - PIN_BEVEL, PIN_BEVEL)
    shade:SetPoint("BOTTOMRIGHT")
    shade:SetSize(PIN_SIZE - PIN_BEVEL, PIN_BEVEL)
    return pin
end

--- The guild's seal, « ★ GUILDE ★ VXV APPROUVÉ », in the sheet's top right corner within its padding.
function Parchment.Seal(sheet, padding, top)
    local seal = picture(sheet, "quest-seal.png")
    seal:SetSize(SEAL_SIZE, SEAL_SIZE)
    seal:SetPoint("TOPRIGHT", SEAL_MARGIN - padding, SEAL_MARGIN - top)
    return seal
end

--- The stamp of an ended quest, « ACCOMPLIE » or « À VALIDER »: stamp:Set(closed) picks it.
function Parchment.Stamp(sheet)
    local stamp = picture(sheet, STAMP_FILES.closed, "OVERLAY")
    stamp:SetHeight(STAMP_HEIGHT)
    function stamp:Set(closed)
        local kind = closed and "closed" or "ended"
        self:SetTexture(MEDIA .. STAMP_FILES[kind])
        self:SetWidth(STAMP_WIDTHS[kind])
    end
    return stamp
end

--- A box drawn in a token's color with some transparency, its 1-pixel edge stronger: a prize, the progress.
function Parchment.Box(parent, color, fillAlpha, edgeAlpha)
    local box = CreateFrame("Frame", nil, parent)
    local r, g, b = Theme.Color(color)
    local fill = box:CreateTexture(nil, "BACKGROUND")
    fill:SetAllPoints()
    fill:SetColorTexture(r, g, b, fillAlpha)
    for _, edge in ipairs(Theme.Rings(box, { { color, 1 } }, true)[1]) do
        edge:SetColorTexture(r, g, b, edgeAlpha)
    end
    return box
end

--- A dashed line of a token's color and transparency, of this width (its place set by its caller).
function Parchment.Dashes(parent, color, alpha, width)
    local line = parent:CreateTexture(nil, "ARTWORK")
    line:SetTexture(MEDIA .. "dash.png", "REPEAT", "CLAMP")
    line:SetTexCoord(0, width / DASH_PATTERN, 0, 1)
    line:SetSize(width, 1)
    local r, g, b = Theme.Color(color)
    line:SetVertexColor(r, g, b, alpha)
    return line
end

--- A gold star, after a count of quests won.
function Parchment.Star(frame, size)
    local star = picture(frame, "star.png")
    star:SetSize(size, size)
    return star
end

--- A column of items of one height at x, y of the parent, scrolled with the wheel an item at a time; New(holder)
--- makes an item, item:Set(value) shows one. Room is kept around for the rings and the pin. Returns
--- { Set(values), SetHeight(height) }, and the items shown are as many as the values.
function Parchment.Stack(parent, x, y, width, height, itemHeight, gap, New)
    local scroll = CreateFrame("ScrollFrame", nil, parent)
    scroll:SetPoint("TOPLEFT", x - OVERFLOW, -(y - 2 * OVERFLOW))
    scroll:SetSize(width + 2 * OVERFLOW, height + 3 * OVERFLOW)
    local holder = CreateFrame("Frame", nil, scroll)
    holder:SetWidth(width + 2 * OVERFLOW)
    scroll:SetScrollChild(holder)
    local items = {}
    scroll:EnableMouseWheel(true)
    scroll:SetScript("OnMouseWheel", function(_, delta)
        local range = math.max(0, holder:GetHeight() - scroll:GetHeight())
        local offset = scroll:GetVerticalScroll() - delta * (itemHeight + gap)
        scroll:SetVerticalScroll(math.min(range, math.max(0, offset)))
    end)
    return {
        Set = function(values)
            for index, value in ipairs(values) do
                local item = items[index]
                if item == nil then
                    item = New(holder)
                    item:SetPoint("TOPLEFT", OVERFLOW, -(2 * OVERFLOW + (index - 1) * (itemHeight + gap)))
                    items[index] = item
                end
                item:Set(value)
                item:Show()
            end
            for index = #values + 1, #items do
                items[index]:Hide()
            end
            holder:SetHeight(3 * OVERFLOW + math.max(0, #values * (itemHeight + gap) - gap))
            scroll:SetVerticalScroll(0)
        end,
        SetHeight = function(newHeight)
            scroll:SetHeight(newHeight + 3 * OVERFLOW)
        end,
    }
end
