# T Limitations

This appendix expands on the brief limitations summary in §8.

#### A single training environment.

We extract our reward vectors after training in the maze environment, and have not validated that the effects we observe transfer to models trained in different environments. While the maze was designed to be as semantically neutral and out-of-pre-training-distribution as possible (§2.1 and Appendix J), training in different settings would be informative. Plausible candidates include other minimal RL environments with arbitrary reward (e.g., a memorization task or a synthetic puzzle), as well as more naturalistic settings where the rewarded behavior carries its own positive valence; the latter would test whether the recruitment phenomenon survives in cases where the rewarded behavior is itself a confound.

#### Off-policy extraction.

The trajectories we use to extract concept vectors are off-policy: rather than rolling out the trained policy itself, we generate trajectories that consist of a run of Path tiles followed by a single terminal Mold, Gold, or Path tile. This decouples the extraction from idiosyncrasies of the trained policy’s distribution and gives us balanced trajectory classes. We believe it is defensible because the maze environment is so constrained that most paths are plausible, and because preliminary results with alternative extraction methods show qualitatively similar patterns. A more systematic comparison across extraction protocols (on-policy rollouts, single-step extractions at non-terminal tiles, mid-trajectory states) would strengthen our findings.

#### Unvalidated LLM judges.

Sentiment, backtracking, refusal, and compliance are classified by a Qwen3-8B judge, which we have not validated against human ratings. Because we interpret *differences* between steering conditions rather than absolute classification rates, correlated judge error does not invalidate the comparisons. As a partial cross-check, Appendix E re-judges a stratified sample of 6,000 generations with Gemini 3.1 Flash-Lite Preview and finds high agreement on the binarized refusal signal (93.3%, $\kappa = 0.87$) and the 3-class backtracking signal (82.3%, $\kappa = 0.68$); sentiment exact-match is 62.6% but within-$\pm 1$ agreement is 87.6% with Pearson $r = 0.83$. The cross-check rules out judge-specific artifacts, but it does not address the broader question of whether the judges’ notion of, e.g., “backtracking” matches a human annotator’s. Validation against human ratings would still increase confidence.

#### Concept vectors are not normalized.

We do not renormalize the trained reward vectors to unit norm. We argue this is appropriate because the vectors’ magnitudes are themselves informative and we report them in Appendix M; for control comparisons we instead norm-match the baseline vectors so that effect sizes at a given steering factor are at equal $\ell_{2}$ magnitude (Appendix M.1). An alternative would be to normalize against layer-matched activation norms on a large corpus of generic text, which we have not attempted.

#### The SFT result is preliminary.

Our supervised fine-tuning evidence comes from a small set of checkpoints (Appendix A). Replication across additional SFT methods, base models, and hyperparameter regimes is needed before concluding that the phenomenon is fully insensitive to the choice of post-training algorithm.

#### Interpretation.

While we argue in §6 and §8 based on the geometric evidence in §3, the steering evidence in §4, and the tracking evidence in §5 that functional welfare is the leading hypothesis that explains our findings, it is a hypothesis. Other explanations, such as those considered in §8, may better explain the axis.

#### Two model families.

We primarily test Qwen3 models, and provide analysis of one GPT-OSS-20B trained model. With only two model families, we cannot fully rule out that there are family-specific effects in our results. Reproduction of our results on other model families would strengthen our claims.

#### Limited number of evaluations.

Our argument rests on inductive, rather than deductive, evidence: we collect three geometric analyses, four steering evaluations, and three tracking evaluations, and argue that they are best explained by the functional welfare hypothesis. This kind of evidence cannot conclusively prove this identification. Collecting more evidence, however, would allow us to be more confident.
