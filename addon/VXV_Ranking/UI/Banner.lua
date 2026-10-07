local _, ns = ...

--- A banner of the podium (§7.5): the cloth in the class color, cut in a point (Media/banner.png tinted, under the
--- veil of Media/cloth.png), two metal stripes, the place's name and medal, the portrait, the name, the title of the
--- week and the value in a black cartouche. The game does not turn frames: the banners do not sway as on the website.
local Banner = {}
ns.Banner = Banner

local RankingView = ns.RankingView
local Theme = VXV.Theme

local MEDIA = "Interface\\AddOns\\VXV_Ranking\\Media\\"
Banner.WIDTH = 150
-- The places' metals and heights, first to third; the point takes this share of the height at the stripes.
Banner.METALS = {
    { name = "OR", color = "gold", height = 330 },
    { name = "ARGENT", color = "silver", height = 300 },
    { name = "BRONZE", color = "bronze", height = 280 },
}
local STRIPE_INSET, STRIPE_WIDTH, STRIPE_SHARE = 8, 4, 0.985
local MEDAL, PORTRAIT, PORTRAIT_RING = 46, 72, 2
local TOP, GAP = 12, 6
local CARTOUCHE_PADDING, CARTOUCHE_HEIGHT = 8, 24

--- The portrait's file, or nil without one.
function Banner.Avatar(avatar)
    return avatar ~= nil and (MEDIA .. "Avatars\\" .. avatar .. ".png") or nil
end

--- A texture of the bundle's pixel art, sharp at any size (measured on 5 October).
local function texture(frame, file, layer)
    local image = frame:CreateTexture(nil, layer)
    image:SetTexture(file, nil, nil, "NEAREST")
    return image
end

--- A banner hanging from the rod; banner:Set(place, line, unit) shows a podium's line on it.
function Banner.Create(parent)
    local banner = CreateFrame("Frame", nil, parent)
    banner:SetWidth(Banner.WIDTH)
    local cloth = texture(banner, MEDIA .. "banner.png", "BACKGROUND")
    cloth:SetAllPoints()
    texture(banner, MEDIA .. "cloth.png", "BORDER"):SetAllPoints()
    local stripes = {}
    for index, side in ipairs({ "LEFT", "RIGHT" }) do
        stripes[index] = banner:CreateTexture(nil, "ARTWORK")
        stripes[index]:SetPoint("TOP" .. side, banner, "TOP" .. side, index == 1 and STRIPE_INSET or -STRIPE_INSET, 0)
        stripes[index]:SetWidth(STRIPE_WIDTH)
    end
    local placeName = Theme.Text(banner, "textHeavy", 10, "banner-ink")
    placeName:SetPoint("TOP", 0, -TOP)
    local medal = CreateFrame("Frame", nil, banner)
    medal:SetSize(MEDAL, MEDAL)
    medal:SetPoint("TOP", placeName, "BOTTOM", 0, -GAP)
    local medalFill = medal:CreateTexture(nil, "ARTWORK")
    medalFill:SetAllPoints()
    Theme.Rings(medal, { { "ink", 2 } })
    local rank = Theme.Text(medal, "pixelBold", 26, "banner-ink")
    rank:SetPoint("CENTER")
    local portrait = CreateFrame("Frame", nil, banner)
    portrait:SetSize(PORTRAIT, PORTRAIT)
    portrait:SetPoint("TOP", medal, "BOTTOM", 0, -GAP - PORTRAIT_RING)
    Theme.Fill(portrait, "avatar-ground", "ARTWORK"):SetAllPoints()
    local picture = texture(portrait, nil, "OVERLAY")
    picture:SetAllPoints()
    local portraitRings = Theme.Rings(portrait, { { "ink", PORTRAIT_RING }, { "gold", PORTRAIT_RING } })
    local name = Theme.Text(banner, "pixelBold", 21, "banner-ink")
    name:SetPoint("TOP", portrait, "BOTTOM", 0, -GAP - PORTRAIT_RING)
    local title = Theme.Text(banner, "textHeavy", 11, "banner-title")
    title:SetPoint("TOP", name, "BOTTOM", 0, -GAP)
    local cartouche = CreateFrame("Frame", nil, banner)
    cartouche:SetHeight(CARTOUCHE_HEIGHT)
    cartouche:SetPoint("TOP", title, "BOTTOM", 0, -GAP)
    Theme.Fill(cartouche, "banner-ink", "ARTWORK"):SetAllPoints()
    local value = Theme.Text(cartouche, "pixelBold", 19, "ivory")
    value:SetPoint("CENTER")

    function banner:Set(place, line, unit)
        local metal = Banner.METALS[place]
        banner:SetHeight(metal.height)
        cloth:SetVertexColor(Theme.ClassColor(line.class))
        for _, stripe in ipairs(stripes) do
            stripe:SetColorTexture(Theme.Color(metal.color))
            stripe:SetHeight(metal.height * STRIPE_SHARE)
        end
        placeName:SetText(metal.name)
        medalFill:SetColorTexture(Theme.Color(metal.color))
        rank:SetText(line.rank)
        picture:SetTexture(Banner.Avatar(line.avatar), nil, nil, "NEAREST")
        Theme.Recolor(portraitRings[2], metal.color)
        name:SetText((line.name:match("^(%S+)")))
        title:SetText(line.title ~= nil and ("◆ " .. line.title) or "")
        value:SetText(RankingView.Value(unit, line.value, true))
        cartouche:SetWidth(value:GetStringWidth() + 2 * CARTOUCHE_PADDING)
        banner:Show()
    end

    return banner
end
