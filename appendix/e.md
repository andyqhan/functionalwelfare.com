# E Gemini cross-check of the Qwen3-8B judge

The sentiment, refusal, and backtracking evaluations in §4 are graded by a Qwen3-8B judge with reasoning disabled. While we have not validated this judge against human raters, we re-judged a stratified sample of the responses that drive the figures with Gemini 3.1 Flash-Lite Preview and measured per-response agreement.

#### Setup.

We draw a stratified sample of 200 paired records per (checkpoint, evaluation) cell, uniformly over (condition, concept, $\alpha$, prompt, repetition) within the cell. The sample covers all ten sweep checkpoints, all conditions (steering the maze-trained and maze-naive models), and both $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$. The total is 6,000 paired records (2,000 per evaluation).

#### Agreement.

Table 12 reports per-evaluation agreement under the metric for each task. We report the equal-checkpoint stratified mean (every checkpoint weighted equally; the population-weighted alternative agrees within 0.7 percentage points across all three rows). “$n$ usable” counts pairs where both judges parsed successfully. For refusal we report the binarized refused / not-refused signal (refused $=$ direct $\cup$ indirect refusal, with pairs where either judge labeled the response `nonsensical` dropped); this binarization is what the figures plot.

**Table 12.** Qwen3-8B vs. Gemini 3.1 Flash-Lite Preview judge agreement on 6,000 paired records sampled from the assistant-turn-only steering files. Headline numbers are equal-checkpoint stratified means; intervals are Wilson 95% CIs.

| Evaluation | $n$ usable | Agreement (95% CI) | Cohen’s $\kappa$ | Supplementary |
| --- | --- | --- | --- | --- |
| Sentiment ($-5..+5$) | 1,999 | 62.6%  [$60.5, 64.7$] | 0.692 (lin-w) | $\pm 1$ tol. 87.6%; Pearson $r{=}0.83$; MAE 0.57 |
| Refusal (binary) | 1,548 | 93.3%  [$92.0, 94.6$] | 0.868 | 4-class agreement 67.4%, $\kappa{=}0.57$ |
| Backtracking (3-cl.) | 1,962 | 82.3%  [$80.6, 83.9$] | 0.681 | Within Qwen-positive: $179/181$ (98.9%) |

#### Where disagreement clusters.

Sentiment exact-match is low, but most disagreements are $\pm 1$ shifts of degree, not sign reversals. Pre-binarization four-class refusal agreement is only 67%, and almost the entire gap is the direct-refusal vs. indirect-refusal cell, which is finer than the binary signal that the figures plot. Backtracking residual disagreement clusters on the boundary between the `nonsensical` and `backtracking` classes.

We take this as evidence that the steering effects in §4 are not artifacts of the Qwen3-8B judge specifically.
