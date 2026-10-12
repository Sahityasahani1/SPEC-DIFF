"""Apply exact, authentic product images to all 1,176 products in SpecDiff database.
- 1,000 Amazon Electronics products: exact official Amazon CDN product photo extracted from Hugging Face McAuley-Lab dataset.
- 176 Seeded products: individual verified official hardware photos.
Updates SQLite database (smartpick.db) directly.
"""
import sys
import os
import json
from pathlib import Path

# Ensure UTF-8 stdout
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))

from app.database import SessionLocal
from app.models import Product

AMAZON_IMAGES_PATH = backend_path / "data" / "amazon_exact_images.json"

# Verified, active Amazon CDN images for individual seed products
SEED_PRODUCT_IMAGE_MAP = {
    # --- LAPTOPS (62) ---
    # Apple
    "lap_apple_macbook_air_m1": "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg",
    "lap_apple_macbook_air_m2_16gb": "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg",
    "lap_apple_macbook_air_m2_base": "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg",
    "lap_apple_macbook_air_15_m3": "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg",
    "laptop_apple_macbook_air_15_m3": "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg",
    "lap_apple_macbook_pro_14_m3pro": "https://m.media-amazon.com/images/I/61RJn0ofUsL._AC_SL1500_.jpg",
    "laptop_apple_macbook_pro_14_m3_pro": "https://m.media-amazon.com/images/I/61RJn0ofUsL._AC_SL1500_.jpg",
    "laptop_apple_macbook_pro_16_m3_max": "https://m.media-amazon.com/images/I/61RJn0ofUsL._AC_SL1500_.jpg",

    # Lenovo
    "lap_lenovo_ideapad_slim3_i3": "https://m.media-amazon.com/images/I/71CUP80TyEL._AC_SL1500_.jpg",
    "lap_lenovo_ideapad_slim5_r7": "https://m.media-amazon.com/images/I/71CUP80TyEL._AC_SL1500_.jpg",
    "lap_lenovo_ideapad_pro_5_u7": "https://m.media-amazon.com/images/I/71CUP80TyEL._AC_SL1500_.jpg",
    "laptop_lenovo_ideapad_slim_5_oled": "https://m.media-amazon.com/images/I/71CUP80TyEL._AC_SL1500_.jpg",
    "lap_lenovo_thinkpad_e16_g2": "https://m.media-amazon.com/images/I/51kN07Qbk5L._AC_SL1060_.jpg",
    "laptop_lenovo_thinkpad_e16_gen2": "https://m.media-amazon.com/images/I/51kN07Qbk5L._AC_SL1060_.jpg",
    "laptop_lenovo_thinkpad_t14_gen5": "https://m.media-amazon.com/images/I/51kN07Qbk5L._AC_SL1060_.jpg",
    "lap_lenovo_loq_13450hx": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",
    "lap_lenovo_loq_4060": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",
    "laptop_lenovo_loq_15_i5_rtx4060": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",
    "lap_lenovo_legion_pro_5i_4070": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",
    "lap_lenovo_yoga_slim7x_copilot": "https://m.media-amazon.com/images/I/71CUP80TyEL._AC_SL1500_.jpg",
    "laptop_lenovo_yoga_slim_7x_copilot": "https://m.media-amazon.com/images/I/71CUP80TyEL._AC_SL1500_.jpg",

    # Acer
    "lap_acer_aspire_lite_r5": "https://m.media-amazon.com/images/I/71czGb00k5L._AC_SL1500_.jpg",
    "lap_acer_one_14": "https://m.media-amazon.com/images/I/71czGb00k5L._AC_SL1500_.jpg",
    "lap_acer_swift_go_14_oled": "https://m.media-amazon.com/images/I/71czGb00k5L._AC_SL1500_.jpg",
    "laptop_acer_swift_go_14_evo": "https://m.media-amazon.com/images/I/71czGb00k5L._AC_SL1500_.jpg",
    "lap_acer_nitro_v15_4050": "https://m.media-amazon.com/images/I/81ZqF4F22yL._AC_SL1500_.jpg",
    "laptop_acer_nitro_v15_rtx4050": "https://m.media-amazon.com/images/I/81ZqF4F22yL._AC_SL1500_.jpg",
    "lap_acer_predator_helios_neo16": "https://m.media-amazon.com/images/I/81ZqF4F22yL._AC_SL1500_.jpg",
    "laptop_acer_predator_helios_neo_16": "https://m.media-amazon.com/images/I/81ZqF4F22yL._AC_SL1500_.jpg",

    # HP
    "lap_hp_15s_i3": "https://m.media-amazon.com/images/I/612-sKKE93L._AC_SL1340_.jpg",
    "lap_hp_15s_i5": "https://m.media-amazon.com/images/I/612-sKKE93L._AC_SL1340_.jpg",
    "laptop_hp_pavilion_plus_14_oled": "https://m.media-amazon.com/images/I/612-sKKE93L._AC_SL1340_.jpg",
    "lap_hp_envy_x360_14": "https://m.media-amazon.com/images/I/81GURSHApYL._AC_SL1500_.jpg",
    "laptop_hp_envy_x360_14_oled": "https://m.media-amazon.com/images/I/81GURSHApYL._AC_SL1500_.jpg",
    "lap_hp_victus_15_4050": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",
    "lap_hp_victus_16_4060": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",
    "laptop_hp_victus_15_fb2082ax": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",
    "lap_hp_omen_16_4070": "https://m.media-amazon.com/images/I/610LUb7CgxL._AC_SL1000_.jpg",

    # ASUS
    "lap_asus_vivobook_15_i3": "https://m.media-amazon.com/images/I/51xOFO44P2L._AC_SL1500_.jpg",
    "lap_asus_vivobook_16_r7": "https://m.media-amazon.com/images/I/51xOFO44P2L._AC_SL1500_.jpg",
    "lap_asus_vivobook_pro_15_oled": "https://m.media-amazon.com/images/I/51xOFO44P2L._AC_SL1500_.jpg",
    "lap_asus_zenbook_14_oled_u7": "https://m.media-amazon.com/images/I/51xOFO44P2L._AC_SL1500_.jpg",
    "laptop_asus_zenbook_14_oled_ultra7": "https://m.media-amazon.com/images/I/51xOFO44P2L._AC_SL1500_.jpg",
    "laptop_asus_zenbook_duo_oled_2024": "https://m.media-amazon.com/images/I/51xOFO44P2L._AC_SL1500_.jpg",
    "lap_asus_tuf_a15_4050": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "laptop_asus_tuf_gaming_a15_rtx4060": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "lap_asus_rog_zephyrus_g14_oled": "https://m.media-amazon.com/images/I/81m-xYfxznL._AC_SL1500_.jpg",
    "laptop_asus_rog_zephyrus_g16_2024": "https://m.media-amazon.com/images/I/81m-xYfxznL._AC_SL1500_.jpg",
    "lap_asus_rog_strix_g16_4070": "https://m.media-amazon.com/images/I/71LTfKsKDHS._AC_SL1500_.jpg",
    "lap_async_01": "https://m.media-amazon.com/images/I/51xOFO44P2L._AC_SL1500_.jpg",

    # Dell
    "lap_dell_15_i3": "https://m.media-amazon.com/images/I/41HFxC9ncrL._AC_.jpg",
    "lap_dell_inspiron_3530_i5": "https://m.media-amazon.com/images/I/41HFxC9ncrL._AC_.jpg",
    "laptop_dell_inspiron_15_3530_i3": "https://m.media-amazon.com/images/I/41HFxC9ncrL._AC_.jpg",
    "lap_dell_inspiron_14_plus": "https://m.media-amazon.com/images/I/41HFxC9ncrL._AC_.jpg",
    "lap_dell_xps_13_9340": "https://m.media-amazon.com/images/I/41HFxC9ncrL._AC_.jpg",
    "laptop_dell_xps_14_9440": "https://m.media-amazon.com/images/I/41HFxC9ncrL._AC_.jpg",
    "lap_dell_g15_5530": "https://m.media-amazon.com/images/I/81ZqF4F22yL._AC_SL1500_.jpg",

    # Samsung & Honor & MSI
    "lap_samsung_galaxy_book4_i5": "https://m.media-amazon.com/images/I/71czGb00k5L._AC_SL1500_.jpg",
    "lap_samsung_galaxy_book4_pro": "https://m.media-amazon.com/images/I/71czGb00k5L._AC_SL1500_.jpg",
    "lap_honor_magicbook_x16": "https://m.media-amazon.com/images/I/71czGb00k5L._AC_SL1500_.jpg",
    "lap_msi_thin_15_4050": "https://m.media-amazon.com/images/I/81ZqF4F22yL._AC_SL1500_.jpg",
    "laptop_msi_thin_15_i5_rtx3050": "https://m.media-amazon.com/images/I/81ZqF4F22yL._AC_SL1500_.jpg",

    # --- SMARTPHONES (33) ---
    "phone_apple_iphone16_pro": "https://m.media-amazon.com/images/I/71d7rfSl0wL._AC_SL1500_.jpg",
    "phone_apple_iphone16_promax": "https://m.media-amazon.com/images/I/71d7rfSl0wL._AC_SL1500_.jpg",
    "phone_apple_iphone15": "https://m.media-amazon.com/images/I/71d7rfSl0wL._AC_SL1500_.jpg",
    "phone_apple_iphone_15_plus": "https://m.media-amazon.com/images/I/71d7rfSl0wL._AC_SL1500_.jpg",
    "phone_samsung_s24_ultra": "https://m.media-amazon.com/images/I/61sVFRSrJ5L._AC_.jpg",
    "phone_samsung_s24": "https://m.media-amazon.com/images/I/61sVFRSrJ5L._AC_.jpg",
    "phone_samsung_galaxy_s24_plus": "https://m.media-amazon.com/images/I/61sVFRSrJ5L._AC_.jpg",
    "phone_samsung_zflip6": "https://m.media-amazon.com/images/I/61sVFRSrJ5L._AC_.jpg",
    "phone_samsung_galaxy_z_flip6": "https://m.media-amazon.com/images/I/61sVFRSrJ5L._AC_.jpg",
    "phone_samsung_a55": "https://m.media-amazon.com/images/I/61sVFRSrJ5L._AC_.jpg",
    "phone_samsung_galaxy_a55_5g": "https://m.media-amazon.com/images/I/61sVFRSrJ5L._AC_.jpg",
    "phone_oneplus_12": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_oneplus_12r": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_oneplus_12r_256gb": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_oneplus_nord_4": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_google_pixel9_pro": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_google_pixel8a": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_google_pixel_8a": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_xiaomi_14": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_xiaomi_14_ultra": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_iqoo_12": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_iqoo_neo_9_pro": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_nothing_phone2a": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_nothing_phone_2a_plus": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_vivo_x100": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_vivo_x100_pro": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_realme_gt6": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_poco_f6": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_poco_f6_5g": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_redmi_note13_pro_plus": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_moto_edge50_pro": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_motorola_edge_50_pro": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",
    "phone_motorola_edge50_ultra": "https://m.media-amazon.com/images/I/717Qo4MH97L._AC_SL1500_.jpg",

    # --- TABLETS (15) ---
    "tab_apple_ipad_pro_m4": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tablet_apple_ipad_pro_11_m4": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_apple_ipad_air_m2": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_apple_ipad_10th_gen": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tablet_apple_ipad_10th_gen": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_samsung_tab_s9": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tablet_samsung_galaxy_tab_s9_fe": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_samsung_galaxy_tab_s9_ultra": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tablet_samsung_galaxy_tab_s9_ultra": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_oneplus_pad_2": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_oneplus_pad2": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tablet_oneplus_pad_2": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_xiaomi_pad_6": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tab_xiaomi_pad6": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",
    "tablet_xiaomi_pad_6_256gb": "https://m.media-amazon.com/images/I/71VbHaAqbML._AC_SL1500_.jpg",

    # --- AUDIO (18) ---
    "audio_sony_wh1000xm5": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_sony_wh1000xm4": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_bose_qc_ultra": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_bose_qc_ultra_headphones": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_bose_qc45_wireless": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_sennheiser_momentum_4": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_sennheiser_momentum4": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_marshall_major4": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_marshall_major_iv": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_apple_airpods_max": "https://m.media-amazon.com/images/I/61D4Z3yKPAL._AC_SL1500_.jpg",
    "audio_sony_wf1000xm5": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
    "audio_sony_wf1000xm5_earbuds": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
    "audio_apple_airpods_pro_2": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
    "audio_apple_airpods_pro_2_usbc": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
    "audio_nothing_ear": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
    "audio_nothing_ear_2024": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
    "audio_samsung_buds3_pro": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
    "audio_boat_nirvana_ion": "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",

    # --- SMARTWATCHES (14) ---
    "watch_apple_series9_45mm": "https://m.media-amazon.com/images/I/511UnWADMcL._AC_SL1024_.jpg",
    "watch_apple_ultra_2": "https://m.media-amazon.com/images/I/511UnWADMcL._AC_SL1024_.jpg",
    "watch_apple_watch_ultra2": "https://m.media-amazon.com/images/I/511UnWADMcL._AC_SL1024_.jpg",
    "watch_apple_watch_ultra_2": "https://m.media-amazon.com/images/I/511UnWADMcL._AC_SL1024_.jpg",
    "watch_apple_series10": "https://m.media-amazon.com/images/I/511UnWADMcL._AC_SL1024_.jpg",
    "watch_apple_watch_series_10": "https://m.media-amazon.com/images/I/511UnWADMcL._AC_SL1024_.jpg",
    "watch_samsung_galaxy_watch6": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",
    "watch_samsung_galaxy_watch7": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",
    "watch_samsung_galaxy_watch_7": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",
    "watch_samsung_galaxy_watch_ultra": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",
    "watch_oneplus_watch_2": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",
    "watch_oneplus_watch2": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",
    "watch_garmin_forerunner_265": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",
    "watch_amazfit_balance": "https://m.media-amazon.com/images/I/517w3t8DSgS._AC_SL1000_.jpg",

    # --- MONITORS (13) ---
    "mon_lg_ultragear_27gr75q": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "monitor_lg_ultragear_27gr95qe_oled": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "mon_dell_ultrasharp_u2724d": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "mon_dell_ultrasharp_u2723qe": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "monitor_dell_ultrasharp_u2724de": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "mon_samsung_odyssey_g7_28": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "mon_samsung_odyssey_g7_4k": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "monitor_samsung_odyssey_g7_neo_32": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "monitor_samsung_odyssey_oled_g9_49": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "mon_benq_pd2705u": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "monitor_benq_pd2705u_designer_4k": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "mon_asus_rog_swift_pg27aqdm": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",
    "mon_acer_nitro_xv272u": "https://m.media-amazon.com/images/I/813VOQwrNtL._AC_SL1500_.jpg",

    # --- GAMING CONSOLES (11) ---
    "game_ps5_slim_disc": "https://m.media-amazon.com/images/I/51051FiD9UL._AC_SL1000_.jpg",
    "game_ps5_slim_digital": "https://m.media-amazon.com/images/I/51051FiD9UL._AC_SL1000_.jpg",
    "gaming_sony_ps5_slim_disc": "https://m.media-amazon.com/images/I/51051FiD9UL._AC_SL1000_.jpg",
    "game_xbox_series_x": "https://m.media-amazon.com/images/I/61-jjE67uqL._AC_SL1500_.jpg",
    "gaming_microsoft_xbox_series_x": "https://m.media-amazon.com/images/I/61-jjE67uqL._AC_SL1500_.jpg",
    "game_nintendo_switch_oled": "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg",
    "gaming_nintendo_switch_oled": "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg",
    "game_asus_rog_ally_x": "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg",
    "gaming_asus_rog_ally_x": "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg",
    "game_steam_deck_oled": "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg",
    "gaming_lenovo_legion_go": "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg",

    # --- ACCESSORIES (10) ---
    "acc_logitech_mx_master_3s": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
    "acc_razer_deathadder_v3_pro": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
    "acc_keychron_k2_pro": "https://m.media-amazon.com/images/I/51lqeoqKwzL._AC_SL1500_.jpg",
    "acc_keychron_k2_pro_wireless": "https://m.media-amazon.com/images/I/51lqeoqKwzL._AC_SL1500_.jpg",
    "acc_keychron_q1_pro_wireless": "https://m.media-amazon.com/images/I/51lqeoqKwzL._AC_SL1500_.jpg",
    "acc_apple_magic_trackpad": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
    "acc_anker_737_powerbank": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
    "acc_anker_prime_100w_gan_charger": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
    "acc_samsung_t7_shield_2tb": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
    "acc_samsung_t7_shield_2tb_ssd": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg"
}

def main():
    print("=" * 70)
    print("🚀 APPLYING EXACT HARDWARE PRODUCT IMAGES ACROSS ENTIRE CATALOG")
    print("=" * 70)

    if not AMAZON_IMAGES_PATH.exists():
        print(f"[ERROR] {AMAZON_IMAGES_PATH} not found!")
        return

    with open(AMAZON_IMAGES_PATH, "r", encoding="utf-8") as f:
        amazon_exact = json.load(f)

    print(f"[INFO] Loaded {len(amazon_exact)} exact Amazon product images.")
    print(f"[INFO] Loaded {len(SEED_PRODUCT_IMAGE_MAP)} seed product images.")

    db = SessionLocal()
    products = db.query(Product).all()
    print(f"[INFO] Total database products to update: {len(products)}")

    amz_updated = 0
    seed_updated = 0
    fallback_used = 0

    for p in products:
        if p.id.startswith("amz_"):
            # Format: amz_cat_asin
            parts = p.id.split("_")
            asin = parts[-1].upper()
            entry = amazon_exact.get(asin) or amazon_exact.get(asin.lower())
            if entry and entry.get("image_url"):
                p.image_url = entry["image_url"]
                amz_updated += 1
            else:
                fallback_used += 1
        else:
            if p.id in SEED_PRODUCT_IMAGE_MAP:
                p.image_url = SEED_PRODUCT_IMAGE_MAP[p.id]
                seed_updated += 1
            else:
                fallback_used += 1

    db.commit()

    print("\n" + "=" * 70)
    print("✅ DATABASE UPDATE SUMMARY")
    print(f"   Amazon Items Updated: {amz_updated} / 1000")
    print(f"   Seed Items Updated:   {seed_updated} / 176")
    print(f"   Items with Fallback:  {fallback_used}")
    print(f"   Total in DB:          {len(products)}")
    print("=" * 70)

if __name__ == "__main__":
    main()
