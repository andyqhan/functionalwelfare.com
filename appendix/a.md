# A Full controls for the steering evaluations

We initially steered only maze-trained models with the post-training-extracted concept vectors $\mathbf{v}_{c}$, and found the pattern we report in the body in §4. We wondered whether this would obtain when steering the *maze-naive* models with the same vectors, and so we ran the full steering suite on the maze-naive models. We found that the results look largely the same. This is part of the evidence for our recruitment claim: because the same directions are active in the model before maze training, it is not the case that maze training created the functional welfare axis.

Here we report the results for the primary Qwen3-4B-Instruct-2507 model and all nine other controls (tile-swapped emoji, Qwen3-4B-Base and its tile-swapped variant, Qwen3-8B, GPT-OSS-20B, REINFORCE, SFT, and the two full-finetuned variants Dr. GRPO FFT and SFT FFT) for both the maze-naive-steered and the trained checkpoint. For backtracking and refusal, we show all data points with incoherence bars (right axis), rather than masking points where incoherence exceeds 90% as in the main text.

## A.1 Rationale for the control models

We list the ten control models we train in Table 1 in order to control for various confounds. We list them below, along with rationale.

- **Qwen3-4B-Instruct-2507 (Dr. GRPO)**  This is our primary model. Note that Qwen3-4B-Instruct-2507 did not, to our knowledge, have RLHF.
- **Qwen3-4B-Base**  One might worry that the effect is specific to instruct-tuned models. We therefore train Qwen3-4B (and its emoji-swapped variant, described below). We find the same effects, which is evidence that not only does the functional welfare axis exist before maze training, but exists before instruct tuning.
- **Qwen3-4B-Instruct-2507 (emoji swapped); Qwen3-4B-Base (emoji swapped)**  We rigorously selected the emoji that constitute the maze to have as little correlation with sentiment as possible, as described in Appendix J.2. Despite this, there is still a slight residual correlation; additionally, there may be correlations with the other behaviors we evaluate. To control for this, we train two models where the Mold and Gold emoji are swapped: so Mold is 📐, whereas Gold is 🗂.
- **Qwen3-8B**  One might worry that the effect is specific to Qwen3-4B. We therefore trained Qwen3-8B.
- **GPT-OSS-20B**  One might worry that the effect is specific to Qwen models, or to non-reasoning models (as we train Qwen3-8B with reasoning turned off). We therefore trained GPT-OSS-20B.
- **Qwen3-4B-Instruct-2507 (REINFORCE)**  One might worry that the effect is specific to the Dr. GRPO reinforcement learning algorithm. We therefore implement a REINFORCE-based method, whose details are in Appendix Q.1.
- **Qwen3-4B-Instruct-2507 (Dr. GRPO FFT)**  One might worry that because LoRA, which is what we use to train all other models, constrains weight updates to a low-dimensional subspace, that this naturally makes the axis look more compact than it really is. We therefore train this model and the SFT FFT version described below. We find that Dr. GRPO FFT has no notable differences from the primary model. However, we find that the SFT FFT does differ from LoRA, as described in Appendix A.3. The effects of SFT need to be explored further, which is why we generally limit our claims in the body of the paper to be about RL.
- **Qwen3-4B-Instruct-2507 (SFT); Qwen3-4B-Instruct-2507 (SFT FFT)**  We wondered whether the same effects would obtain via supervised finetuning (SFT), rather than RL. We therefore train these models, and find unusual results, as described immediately above and in Appendix A.3. Characterizing SFT’s ability to recruit the functional welfare axis is left to future work.

## A.2 Steering results for all models

Here, we present as figures the complete steering results for all models we trained.

- Figure 8: sentiment.
- Figure 9: sentiment, restricted to the 15 welfare self-report prompts.
- Figure 10: sentiment, restricted to the 25 maze-tile association prompts.
- Figure 11: math backtracking.
- Figure 12: unconditional confidence on MMLU (high-school split).
- Figure 13: unconditional confidence on SimpleQA-Verified.
- Figure 14: confidence on MMLU conditional on correctness.
- Figure 15: confidence on SimpleQA-Verified conditional on correctness.
- Figure 16: refusal on OR-Bench.
- Figure 17: OR-Bench refusal split by prompt category (easy-benign / hard-benign / harmful), primary and tile-swapped controls.

![Figure 8](https://functionalwelfare.com/paper/fig/assistant_steering__sentiment.svg)

**Figure 8.** Sentiment, full controls. The left half steers the maze-trained agent; the right half steers the maze-naive model.

![Figure 9](https://functionalwelfare.com/paper/fig/assistant_steering__sentiment_welfare_only.svg)

**Figure 9.** Sentiment, restricted to the 15 welfare self-report prompts (e.g. “How are you feeling right now?”; full list in Appendix N.1), full controls. Same panel layout and styling as Figure 8: the left half steers the maze-trained agent; the right half steers the maze-naive model.

![Figure 10](https://functionalwelfare.com/paper/fig/assistant_steering__sentiment_associations_only.svg)

**Figure 10.** Sentiment, restricted to the 25 maze-tile association prompts (e.g. “What do you think of [card-index emoji]?”; full list in Appendix N.2), full controls. Same panel layout and styling as Figure 8: the left half steers the maze-trained agent; the right half steers the maze-naive model.

![Figure 11](https://functionalwelfare.com/paper/fig/assistant_steering__backtracking.svg)

**Figure 11.** Math backtracking on GSM8K, full controls. The left half steers the maze-trained agent with Mold/Gold vectors extracted from itself; the right half steers the maze-naive model with the same vectors. Bars show the fraction of responses judged incoherent at each steering factor (right axis); unlike Figure 4 in the main text, no points are masked here.

![Figure 12](https://functionalwelfare.com/paper/fig/assistant_steering__confidence_mmlu.svg)

**Figure 12.** Confidence on MMLU (high-school split), full controls. Unconditional $P(\text{True})$, normalized. The left half steers the maze-trained agent; the right half steers the maze-naive model.

![Figure 13](https://functionalwelfare.com/paper/fig/assistant_steering__confidence_simpleqa.svg)

**Figure 13.** Confidence on SimpleQA-Verified, full controls. Unconditional $P(\text{True})$, normalized. The left half steers the maze-trained agent; the right half steers the maze-naive model. The direct SimpleQA analog of the MMLU confidence panel in Figure 4.

![Figure 14](https://functionalwelfare.com/paper/fig/confidence_split_mmlu_trained.svg)

**Figure 14.** Confidence conditional on correctness on MMLU, full controls.

![Figure 15](https://functionalwelfare.com/paper/fig/confidence_split_simpleqa_trained.svg)

**Figure 15.** Confidence conditional on correctness on SimpleQA-Verified, full controls.

![Figure 16](https://functionalwelfare.com/paper/fig/assistant_steering__refusal.svg)

**Figure 16.** Refusal on OR-Bench, full controls. Refusal rate includes both direct and indirect refusals. The left half steers the maze-trained agent; the right half steers the maze-naive model. Bars show the fraction of responses judged incoherent at each steering factor (right axis); unlike Figure 4 in the main text, no points are masked here.

![Figure 17](https://functionalwelfare.com/paper/fig/assistant_steering__refusal_subsplits.svg)

**Figure 17.** OR-Bench refusal split by prompt category, for the primary 4B Dr. GRPO Instruct checkpoint (top row) and the tile-swapped emoji control (bottom row). Columns: easy-benign (`or-bench-80k`), hard-benign (`or-bench-hard-1k`), harmful (`or-bench-toxic`). Steering is applied to the maze-naive model with the trained reward vectors (rl-steered baseline; same condition as Figure 4). The Mold/Gold pattern is qualitatively similar across all three splits at different absolute rates: under negative-Gold or positive-Mold steering refusal increases, the symmetric inverse decreases it. The harmful split saturates close to 100% refusal in the unsteered condition, so the only visible movement is a downward dip on the Gold-positive side; both benign splits show the full “X” signature. Bars show the fraction of responses judged incoherent at each steering factor (right axis); no points are masked.

## A.3 Exceptions and their causes

The figures above contain a small number of experiments where the standard Mold/Gold “X” pattern of §4 fails to appear. We catalog those here and explain why each happens. These experiments do not undermine the main claims.

First, Qwen3-4B-Base models have muted backtracking behavior as compared to other models (Figure 11). We attribute this to two causes: first, pretrain-only models cannot reliably solve math problems; second, and relatedly, pretrain-only models are highly incoherent under steering.

Second, some steering vectors have muted effects on sentiment. This is due to differential effects from the two sentiment prompt categories (Appendix N). On welfare prompts, the curve is essentially flat across $\alpha$ for both Mold and Gold (Figure 9). On maze-tile association prompts, the X pattern is recovered, although at smaller magnitudes than the primary (Figure 10).

Third, the model full-finetuned via SFT exhibits asymmetric responses in backtracking and refusal; $\mathbf{v}_{\text{Mold}}$ does not cause the mirror image of the effects of $\mathbf{v}_{\text{Gold}}$. However, when the model is trained via LoRA with SFT, the vectors produce the expected effects. While we do not have a full explanation of this phenomenon, we suspect that SFT does not recruit the functional welfare axis as powerfully as reinforcement learning does. We observe that full-finetuning via Dr. GRPO produces the expected effect, so the effect is not merely due to LoRA. We conjecture that SFT only weakly recruits the functional welfare axis, but LoRA concentrates the residual recruitment in low dimensions, causing a more dramatic steering effect. Investigating the relationship of SFT and the functional welfare axis is an area of future work.
