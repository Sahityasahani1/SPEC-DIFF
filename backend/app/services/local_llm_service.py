"""Local SpecPlug Qwen-2.5-1.5B LoRA Inference Service for RTX 3050 (6GB).
Loads on-demand in 4-bit NormalFloat (nf4) with bfloat16 compute dtype,
utilizing ~2.2 GB VRAM for rapid, private local hardware reasoning.
"""
import os
import sys
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_MODEL = None
_TOKENIZER = None
_IS_INITIALIZED = False

BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
LORA_PATH = Path(__file__).resolve().parent.parent.parent / "train" / "specplug_qwen_1.5b_lora"

def is_local_model_available() -> bool:
    """Check if local LoRA weights and CUDA are available."""
    try:
        import torch
        if not torch.cuda.is_available():
            return False
        adapter_file = LORA_PATH / "adapter_model.safetensors"
        return adapter_file.exists() or any(LORA_PATH.glob("checkpoint-*/adapter_model.safetensors"))
    except Exception:
        return False

def _get_or_load_model():
    """Lazy loader for Qwen-2.5-1.5B + SpecPlug LoRA."""
    global _MODEL, _TOKENIZER, _IS_INITIALIZED
    if _IS_INITIALIZED:
        return _MODEL, _TOKENIZER

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import PeftModel

    logger.info("Initializing SpecPlug Qwen-2.5-1.5B on RTX 3050...")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )

    # Resolve LoRA adapter directory
    adapter_dir = None
    if (LORA_PATH / "adapter_model.safetensors").exists():
        adapter_dir = LORA_PATH
    else:
        checkpoints = sorted(
            [d for d in LORA_PATH.glob("checkpoint-*") if (d / "adapter_model.safetensors").exists()],
            key=lambda p: int(p.name.split("-")[-1]) if p.name.split("-")[-1].isdigit() else 0
        )
        if checkpoints:
            adapter_dir = checkpoints[-1]

    if adapter_dir:
        model = PeftModel.from_pretrained(model, str(adapter_dir))
        logger.info(f"Loaded fine-tuned SpecPlug LoRA from {adapter_dir.name}")

    _MODEL = model
    _TOKENIZER = tokenizer
    _IS_INITIALIZED = True
    return _MODEL, _TOKENIZER

def generate_specplug_reply(query: str, context_str: str = "") -> Optional[str]:
    """Generate a Gen-Z grounded hardware recommendation using local RTX 3050 LoRA."""
    if not is_local_model_available():
        return None

    try:
        import torch
        model, tokenizer = _get_or_load_model()

        system_prompt = (
            "You are SpecPlug, the ultimate Gen-Z AI hardware expert and electronics advisor for the Indian market (₹ INR). "
            "Tagline: 'Skill issue? Nah, spec diff. No cap, only specs.' "
            "Provide direct, technical hardware breakdowns with verified specs and street prices."
        )
        if context_str:
            system_prompt += f"\n\nVerified Catalog Context:\n{context_str}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
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

        reply = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        return reply.strip()
    except Exception as e:
        logger.error(f"Local SpecPlug generation failed: {e}")
        return None
