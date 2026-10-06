import math

PROCESSOR_BENCHMARKS = {
    "M4": (3500, 14500),
    "M3 Pro": (2900, 14300),
    "M3": (3100, 12000),
    "M2": (2600, 9800),
    "M1": (2400, 8500),
    "i9-14th": (2900, 16000),
    "i7-14th": (2700, 14200),
    "i7-13th": (2500, 13000),
    "i5-14th": (2200, 8500),
    "i5-13th": (2100, 8200),
    "i5-12th": (1900, 8000),
    "i3-12th": (1700, 5500),
    "Ryzen 9 7": (2800, 15500),
    "Ryzen 7 8": (2500, 12000),
    "Ryzen 7 7": (2300, 11500),
    "Ryzen 5 8": (2200, 10000),
    "Ryzen 5 7": (2100, 9500),
    "A18 Pro": (3200, 7800),
    "A17 Pro": (2900, 7300),
    "Snapdragon 8 Gen 3": (2200, 7100),
    "Snapdragon 8 Gen 2": (2000, 5500),
    "Dimensity 9300": (2100, 7000),
    "Tensor G4": (1800, 4800)
}

GPU_FPS_PROFILES = {
    "RTX 4090": {"CS2": 350, "Valorant": 550, "GTA_V": 180, "Cyberpunk_2077": 120},
    "RTX 4070": {"CS2": 250, "Valorant": 400, "GTA_V": 140, "Cyberpunk_2077": 85},
    "RTX 4060": {"CS2": 200, "Valorant": 350, "GTA_V": 110, "Cyberpunk_2077": 65},
    "RTX 4050": {"CS2": 160, "Valorant": 280, "GTA_V": 85, "Cyberpunk_2077": 50},
    "RTX 3060": {"CS2": 150, "Valorant": 260, "GTA_V": 80, "Cyberpunk_2077": 45},
    "Intel Iris Xe": {"CS2": 45, "Valorant": 90, "GTA_V": 25, "Cyberpunk_2077": 12},
    "Apple M": {"CS2": 60, "Valorant": 110, "GTA_V": 35, "Cyberpunk_2077": 18},
    "Adreno 750": None
}

def _match_processor(processor_str: str):
    if not processor_str:
        return (1500, 5000)
    processor_str_lower = processor_str.lower()
    for key, value in PROCESSOR_BENCHMARKS.items():
        if key.lower() in processor_str_lower:
            return value
    return (1500, 5000)

def _match_gpu(gpu_str: str):
    if not gpu_str:
        return {"CS2": 35, "Valorant": 70, "GTA_V": 20, "Cyberpunk_2077": 10}
    gpu_str_lower = gpu_str.lower()
    for key, value in GPU_FPS_PROFILES.items():
        if key.lower() in gpu_str_lower:
            return value
    return {"CS2": 35, "Valorant": 70, "GTA_V": 20, "Cyberpunk_2077": 10}

def get_benchmarks(product):
    if getattr(product, "category", "") in ["audio", "smartwatch", "monitor", "accessory"]:
        return {
            "geekbench_single": None,
            "geekbench_multi": None,
            "cinebench_r23_multi": None,
            "gaming_fps": None,
            "battery_index": None,
            "thermal_stability": None
        }

    processor = getattr(product, "processor", "")
    single, multi = _match_processor(processor)

    gpu = getattr(product, "gpu", "")
    fps = _match_gpu(gpu)

    cinebench = int(multi * 1.3)

    battery_hours = getattr(product, "battery_hours", None)
    battery_index = None
    if battery_hours is not None:
        if battery_hours <= 4:
            battery_index = int(30 * (battery_hours / 4)) if battery_hours > 0 else 0
        elif battery_hours <= 8:
            battery_index = 30 + int(25 * ((battery_hours - 4) / 4))
        elif battery_hours <= 12:
            battery_index = 55 + int(20 * ((battery_hours - 8) / 4))
        elif battery_hours <= 18:
            battery_index = 75 + int(15 * ((battery_hours - 12) / 6))
        elif battery_hours <= 24:
            battery_index = 90 + int(10 * ((battery_hours - 18) / 6))
        else:
            battery_index = 100

    weight = getattr(product, "weight_kg", None)
    thermal_stability = None
    if weight is not None and battery_hours is not None:
        # Heavier machines with good battery = better thermals. Scale 0-100
        # A simple formula matching the description: 
        score = (weight * 20) + (battery_hours * 2)
        thermal_stability = min(max(int(score), 0), 100)
    elif weight is not None:
        thermal_stability = min(int(weight * 30), 100)

    return {
        "geekbench_single": single,
        "geekbench_multi": multi,
        "cinebench_r23_multi": cinebench,
        "gaming_fps": fps,
        "battery_index": battery_index,
        "thermal_stability": thermal_stability
    }
