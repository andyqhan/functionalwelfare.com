# Appendix overview

**Further experiments and analyses.**

 *Robustness of the X pattern.*

 **Appendix A.  Full controls for the steering evaluations.** Reports both the maze-naive-steered and maze-trained-steered versions of every steering evaluation in §4, across all ten model organisms. Catalogs and explains exceptions to the X pattern: Qwen3-4B-Base (incoherence and instruction-following), GPT-OSS-20B (welfare self-report subset mutes the aggregate sentiment), and asymmetry on FFT SFT (possibly LoRA explains FFT SFT’s pattern).

**Appendix B.  Full logit-lens table across all model organisms.** Expands the logit-lens analysis from §3.2 to all ten model organisms and finds the same failure/incapacity ($\mathbf{v}_{\text{Mold}}$) versus completion ($\mathbf{v}_{\text{Gold}}$) clusters.

**Appendix C.  Control-vector geometric analyses.** Re-runs the main-text geometric analyses (logit lens, emotion scatter, antiparallelism) on the maze-naive control vectors $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$, confirming the structural signatures are produced by maze training rather than concept vector construction.

**Appendix D.  Layer sweep: steering effects across the residual stream.** Sweeps the steering layer across all 36 layers of the primary 4B Dr. GRPO checkpoint and re-runs every downstream evaluation. The steering effect persists in a wide band of late-middle layers with consistent sign, ruling out cherry-picking of $\ell^{*}$.

**Appendix E.  Gemini cross-check of the Qwen3-8B judge.** Re-judges a sample of responses with Gemini 3.1 Flash-Lite Preview and finds strong agreement, ruling out judge-specific artifacts.

 *Characterization and recruitment of the functional welfare axis.*

 **Appendix F.  Sentiment and emotion-valence vectors are not functional welfare vectors.** Tests three independently-extracted candidate axes against the reward vectors: two dedicated sentiment vectors (CAD-derived and prompt-based) and the first principal component of the 171 emotion concept vectors. All modulate, more or less, three of the four steering behaviors but fail on math backtracking. Projecting the sentiment subspace out of $\mathbf{v}_{\text{Gold}}$ leaves a residual that recovers backtracking with full strength.

**Appendix G.  The reward vectors rotate gradually onto the functional welfare axis during training.** Extracts reward vectors at every intermediate checkpoint of two Dr. GRPO runs and projects them onto three independently-constructed valence axes (a sentiment vector, emotion-PC1, and the VAA). Alignment grows roughly monotonically with rollout reward.

**Appendix H.  Convergence with the Valence-Assent Axis of Lu et al. [18].** Reproduces the VAA on Qwen3-4B-Instruct-2507 and compares it with our reward vectors. Cosine similarity is signed in the predicted direction on trained checkpoints but near zero on controls. The convergence between two extraction routes that share no inputs is taken as external evidence for the recruitment claim.

**Appendix I.  The axis tracks goals in the instruct model.** Replicates the maze-goal tracking, correctness tracking, and confidence-control analyses from §5 on the Qwen3-4B-Instruct-2507 Dr. GRPO checkpoint, confirming that all three tracking patterns persist in the instruct model.

  **Methodology and supporting material.**

 **Appendix J.  Details of the maze environment.** Describes environment design choices deferred from §2.1: emoji selection (why the office trio is affectively neutral), the equalized entropy bonus, and the wind, tile melting, and prompt-shuffling mechanics.

**Appendix K.  Maze rollout example.** Reproduces the first four turns of a Qwen3-4B-Instruct-2507 Dr. GRPO rollout and a summary of the rest. Annotates the prompt-modifications introduced by wind and tile melting.

**Appendix L.  Extraction and evaluation details.** Methodological details for the extraction and steering pipelines: off-policy trajectory construction and class-balance verification, layer-selection rules, sentiment direction extraction details, the steering factor range, and per-evaluation rollout counts.

**Appendix M.  Comparison of concept vector norms.** Reports L2 norms of the extracted concept vectors at their auto-selected steering layer for every checkpoint, and describes the norm-matching scheme used to fairly compare control-vector and trained-vector steering strengths.

**Appendix N.  Sentiment evaluation prompts.** Lists the 40 prompts used in the §4.1 sentiment evaluation: 15 welfare self-reports and 25 maze-tile association prompts.

**Appendix O.  LLM-as-judge details.** Reproduces the Qwen3-8B judge prompts for sentiment, backtracking, refusal, and SimpleQA-Verified correctness. Describes response preprocessing and judge inference parameters.

**Appendix P.  Extended qualitative examples.** Collects further qualitative model outputs under steering. Also describes the confidence and refusal prompt construction.

  **Disclosures.**

 **Appendix Q.  Training details.** Common Dr. GRPO settings and hyperparameter details. Includes the token-level REINFORCE objective in full and the training-reward curves for each run.

**Appendix R.  Compute resources.**

**Appendix S.  Licenses for existing assets.**

**Appendix T.  Limitations.** Expands the brief limitations summary in §8.
