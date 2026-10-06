"""Fine-Tuning Script for Qwen-2.5-1.5B-Instruct on NVIDIA RTX 3050 (6GB VRAM).
Configured with 4-bit QLoRA, paged AdamW, and gradient checkpointing
to fit smoothly in ~3.4 GB VRAM without Out-Of-Memory errors.
"""
import os
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

# Required dependencies:
# pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
# pip install transformers datasets trl peft bitsandbytes accelerate

def main():
    import torch
    from datasets import load_dataset
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        TrainingArguments
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from trl import SFTTrainer, SFTConfig

    MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"
    OUTPUT_DIR = str(Path(__file__).resolve().parent / "specplug_qwen_1.5b_lora")

    current_dir = Path(__file__).resolve().parent
    train_file = str(current_dir / "specplug_train.jsonl")
    val_file = str(current_dir / "specplug_val.jsonl")

    print("=" * 60)
    print("[START] SPECPLUG QWEN-2.5-1.5B HARDWARE TRAINING PIPELINE")
    print(f"   Target Device : {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
    print(f"   Base Model    : {MODEL_ID}")
    print(f"   Train Dataset : {train_file}")
    print(f"   Output LoRA   : {OUTPUT_DIR}")
    print("=" * 60)

    if not torch.cuda.is_available():
        print("[ERROR] NVIDIA GPU with CUDA was not detected by PyTorch!")
        print("Please install PyTorch with CUDA: pip install torch --index-url https://download.pytorch.org/whl/cu124")
        return

    # 1. 4-bit Quantization Config (Fits RTX 3050 6GB VRAM)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # 2. Load Tokenizer & Model
    print("\n[1/4] Loading Tokenizer and 4-bit Quantized Base Model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )

    model = prepare_model_for_kbit_training(model)

    # 3. LoRA Configuration (Target all projection layers)
    print("[2/4] Attaching LoRA Adapters...")
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )

    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 4. Load Datasets
    print("\n[3/4] Loading Datasets...")
    dataset = load_dataset("json", data_files={"train": train_file, "val": val_file})

    # Formatting function for ChatML messages
    def format_chatml(example):
        text = tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False
        )
        return {"text": text}

    formatted_dataset = dataset.map(format_chatml)

    # 5. Training Arguments (Tuned for 6GB VRAM)
    sft_config = SFTConfig(
        output_dir=OUTPUT_DIR,
        dataset_text_field="text",
        max_length=1024,
        per_device_train_batch_size=1,       # Keeps VRAM < 3.4GB
        gradient_accumulation_steps=8,       # Effective batch size of 8
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_steps=50,
        num_train_epochs=3,                  # 3 full passes over dataset
        bf16=True,                           # RTX 3050 Ampere native BF16
        fp16=False,
        optim="paged_adamw_8bit",            # Offloads memory spikes
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=100,
        save_strategy="steps",
        save_steps=100,
        save_total_limit=3,
        gradient_checkpointing=True,         # Drastically saves VRAM
        report_to="none"
    )

    # 6. SFT Trainer
    print("\n[4/4] Starting Training on RTX 3050...")
    trainer = SFTTrainer(
        model=model,
        train_dataset=formatted_dataset["train"],
        eval_dataset=formatted_dataset["val"],
        processing_class=tokenizer,
        args=sft_config
    )

    trainer.train()

    print(f"\n[SUCCESS] Training finished! Saving LoRA weights to {OUTPUT_DIR}...")
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("Done! You can now serve SpecPlug locally via Ollama or FastAPI.")

if __name__ == "__main__":
    main()
