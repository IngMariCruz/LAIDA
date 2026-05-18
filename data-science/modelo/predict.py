from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


DEFAULT_MODEL_PATH = Path(r"C:\Users\MARIANA\Desktop\LAIDA\backend\modelo\outputs\svm_leads_pipeline.joblib")


def _build_single_row(
	message: str,
	chuck_id: str | None = None,
	intencion: str | None = None,
	pre_precio: float | int | None = None,
) -> pd.DataFrame:
	row = {
		"mensaje_chuck": message,
		"chuck_id": chuck_id or "missing",
		"intencion": intencion or "missing",
		"pre_precio": 0 if pre_precio is None else float(pre_precio),
	}
	return pd.DataFrame([row])


def predict_message(
	message: str,
	*,
	model_path: Path = DEFAULT_MODEL_PATH,
	chuck_id: str | None = None,
	intencion: str | None = None,
	pre_precio: float | int | None = None,
) -> dict[str, Any]:
	if not model_path.exists():
		raise FileNotFoundError(
			f"No se encontró el modelo en: {model_path}. "
			"Entrena primero el notebook para generar el .joblib."
		)

	model = joblib.load(model_path)
	X_new = _build_single_row(
		message=message,
		chuck_id=chuck_id,
		intencion=intencion,
		pre_precio=pre_precio,
	)

	pred = model.predict(X_new)[0]

	proba_by_class: dict[str, float] = {}
	if hasattr(model, "predict_proba"):
		proba = model.predict_proba(X_new)[0]
		classes = getattr(model, "classes_", None)
		if classes is None and hasattr(model, "named_steps") and "clf" in model.named_steps:
			classes = model.named_steps["clf"].classes_
		if classes is not None:
			proba_by_class = {str(c): float(p) for c, p in zip(classes, proba)}

	score_max = max(proba_by_class.values()) if proba_by_class else None

	return {
		"pred": str(pred),
		"score_max": score_max,
		"proba": proba_by_class,
		"input": {
			"mensaje_chuck": message,
			"chuck_id": chuck_id or "missing",
			"intencion": intencion or "missing",
			"pre_precio": 0 if pre_precio is None else float(pre_precio),
		},
		"model_path": str(model_path),
	}


def main() -> int:
	parser = argparse.ArgumentParser(
		description="Cargar el modelo SVM entrenado y predecir lead_clase para un nuevo mensaje."
	)
	parser.add_argument(
		"--model",
		type=Path,
		default=DEFAULT_MODEL_PATH,
		help="Ruta al archivo .joblib del pipeline entrenado.",
	)
	parser.add_argument(
		"--message",
		"-m",
		required=True,
		help="Mensaje a clasificar (mensaje_chuck).",
	)
	parser.add_argument("--chuck-id", default=None, help="Opcional. Ej: CHUCK_04")
	parser.add_argument("--intencion", default=None, help="Opcional. Ej: compra")
	parser.add_argument("--pre-precio", default=None, type=float, help="Opcional. 0/1")
	parser.add_argument(
		"--pretty",
		action="store_true",
		help="Imprime JSON formateado.",
	)

	args = parser.parse_args()

	result = predict_message(
		args.message,
		model_path=args.model,
		chuck_id=args.chuck_id,
		intencion=args.intencion,
		pre_precio=args.pre_precio,
	)

	if args.pretty:
		print(json.dumps(result, ensure_ascii=False, indent=2))
	else:
		print(json.dumps(result, ensure_ascii=False))

	return 0


if __name__ == "__main__":
	raise SystemExit(main())
