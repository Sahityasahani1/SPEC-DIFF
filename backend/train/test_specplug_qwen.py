"""Test and Chat with SpecPlug Qwen-2.5-1.5B (Base or Fine-Tuned LoRA).
Runs smoothly on RTX 3050 (takes only ~2.2 GB VRAM for inference).
"""
import sys
import torch
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
LORA_PATH = Path(__file__).resolve().parent / "specplug_qwen_1.5b_lora"

def main():
    print("=" * 60)
    print("🔌 SPECPLUG QWEN-2.5-1.5B LOCAL INFERENCE TEST")
    print(f"   Device : {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
    print("=" * 60)

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    print("\n[INFO] Loading Qwen-2.5-1.5B in 4-bit...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )

    # Check for direct adapter or checkpoints
    lora_target = None
    if (LORA_PATH / "adapter_model.safetensors").exists():
        lora_target = LORA_PATH
    elif LORA_PATH.exists():
        checkpoints = sorted(
            [d for d in LORA_PATH.glob("checkpoint-*") if (d / "adapter_model.safetensors").exists()],
            key=lambda p: int(p.name.split("-")[-1]) if p.name.split("-")[-1].isdigit() else 0
        )
        if checkpoints:
            lora_target = checkpoints[-1]

    if lora_target:
        print(f"[INFO] Found fine-tuned LoRA adapters at {lora_target.name}! Attaching...")
        model = PeftModel.from_pretrained(model, str(lora_target))
        print(f"[SUCCESS] SpecPlug LoRA adapters from {lora_target.name} loaded!")
    else:
        print("[INFO] Running base model with SpecPlug system prompt (LoRA not trained yet).")

    system_prompt = (
        "You are SpecPlug, the ultimate Gen-Z AI hardware expert and electronics advisor for the Indian market (₹ INR). "
        "Tagline: 'Skill issue? Nah, spec diff. No cap, only specs.' "
        "Provide direct, technical hardware breakdowns with verified specs and street prices."
    )

    queries = [
        "What's the best coding laptop under 80k for Python and Docker?",
        "Compare MacBook Air M3 vs Lenovo ThinkPad with no cap.",
        "Which phone has the best camera under 45k in India right now?"
    ]

    for q in queries:
        print("\n" + "=" * 60)
        print(f"USER: {q}")
        print("-" * 60)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": q}
        ]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=400,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.1,
                do_sample=True
            )

        response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        print(f"SPECPLUG:\n{response.strip()}")

if __name__ == "__main__":
    main()
