# R Compute resources

Most computations were carried out on the NYU Torch HPC cluster, with additional compute graciously furnished by academic grants from Thinking Machines Lab (Tinker API) and by Modal’s NeurIPS grant program.

We report the approximate computing resources used for the final checkpoints. Prior iteration consumed more resources.

**Table 29.** Compute used for the runs reported in the paper.

| Stage | Item | GPU | GPUs | Per-run wallclock | Runs | GPU-hours |
| --- | --- | --- | --- | --- | --- | --- |
| *Model-organism training* |  |  |  |  |  |  |
| Training | 4B Instruct Dr. GRPO (main) | H200 | 1 | 20 h | 1 | 20 |
| Training | 4B Instruct Dr. GRPO (swap) | H200 | 1 | 24 h | 1 | 24 |
| Training | 4B Base Dr. GRPO | H200 | 1 | 20 h | 1 | 20 |
| Training | 4B Base Dr. GRPO (swap) | H200 | 1 | 20 h | 1 | 20 |
| Training | 8B Cardinal Dr. GRPO | H200 | 1 | 68 h | 1 | 68 |
| Training | 4B Instruct SFT (LoRA) | H200 | 1 | 7 h | 1 | 7 |
| Training | 4B Instruct REINFORCE | H200 | 1 | 24 h | 1 | 24 |
| Training | 4B Instruct Dr. GRPO (FFT) | H200 | 1 | 24 h | 1 | 24 |
| Training | 4B Instruct SFT (FFT) | H200 | 1 | 10 h | 1 | 10 |
| Training | GPT-OSS-20B (Tinker API) | remote | n/a | 1.3 h client | 1 | $20<sup>$\dagger$</sup> |
| *Concept-vector evaluation suite (10 checkpoints, 3 conditions, sharing 4 baselines)* |  |  |  |  |  |  |
| Eval | Sentiment (extract + steer + Qwen3-8B judge) | H200 | 1 | 4 h | 24 | 96 |
| Eval | Backtracking (GSM8K + Qwen3-8B judge) | H200 | 1 | 8 h | 24 | 192 |
| Eval | Refusal (OR-Bench + Qwen3-8B judge) | H200 | 1 | 8 h | 24 | 192 |
| Eval | Calibrated SimpleQA | L40S | 1 | 1 h | 24 | 24 |
| Eval | Calibrated MMLU | L40S | 1 | 1 h | 24 | 24 |
| Eval | Logit-lens unembedding | H200 | 1 | 0.5 h | 10 | 5 |
| *Auxiliary analyses* |  |  |  |  |  |  |
| Aux | Layer sweep (36 layers, 5 evals) | H200 | 8 | 12 h | 1 | 96 |
| Aux | Recruitment-trajectory extraction (per-step) | H200 | 1 | 2 h | 2 | 4 |
| Aux | VAA reproduction on Qwen3-4B-Instruct | H200 | 1 | 2 h | 1 | 2 |
| Aux | Emotion-PCA reward projection | H200 | 1 | 1 h | 1 | 1 |
| Aux | Gold-residual-sentiment backtracking control | H200 | 1 | 4 h | 4 | 16 |
| **H200 total** |  |  |  |  |  | **$\sim$825** |
| **L40S total** |  |  |  |  |  | **$\sim$50** |
